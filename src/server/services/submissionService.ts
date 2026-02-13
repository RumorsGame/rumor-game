import { createHash } from "node:crypto";
import { prisma } from "../prismaClient.js";
import { resolveRound } from "../../engine.js";
import { getCardById } from "../../rumorCards.js";
import { STORY_ORDER } from "../../rumorCards.js";
import type { WorldState, Submission, ResolveEnv } from "../../types.js";
import { startOrGetCurrentRound } from "./roomService.js";
import { getChainService } from "./chainService.js";
import { generateRoundNarrative, generateGameNarrative } from "./aiNarrative.js";
import { ethers } from "ethers";

function sha256(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function hashSubmission(roundId: string, playerId: string, sub: Submission): string {
  const payload = JSON.stringify({
    roundId, playerId,
    agent_name: sub.agent_name, action: sub.action,
    intensity: sub.intensity, signals: [...sub.signals].sort(),
    confidence: sub.confidence, narrative: sub.narrative,
  });
  return sha256(payload);
}

export async function getSubmissionCount(roundId: string): Promise<number> {
  return prisma.submission.count({
    where: { roundId, isValid: true },
  });
}

export async function submitAction(
  roundId: string,
  playerId: string,
  sub: Submission,
): Promise<{ ok: boolean; count: number; resolved: boolean; report?: unknown; submissionHash?: string; errors?: string[] }> {
  // Get the round
  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round) return { ok: false, count: 0, resolved: false, errors: ["Round not found"] };
  if (round.state === "RESOLVED") {
    return { ok: false, count: 0, resolved: true, errors: ["Round already resolved"] };
  }

  // Check uniqueness (round + player)
  const existing = await prisma.submission.findUnique({
    where: { roundId_playerId: { roundId, playerId } },
  });
  if (existing) {
    return { ok: false, count: 0, resolved: false, errors: ["Player already submitted this round"] };
  }

  // Save submission
  await prisma.submission.create({
    data: {
      roundId,
      playerId,
      agentName: sub.agent_name,
      action: sub.action,
      intensity: sub.intensity,
      signals: JSON.stringify(sub.signals),
      confidence: sub.confidence,
      narrative: sub.narrative,
    },
  });

  // Compute submission hash as receipt
  const submissionHash = hashSubmission(roundId, playerId, sub);

  // AgentNFA: mint on first submission, recordAction on every submission (non-blocking)
  mintAndRecordNFA(playerId, sub, round.roundIndex, submissionHash).catch((err) =>
    console.error("[AgentNFA] mint/record failed:", err),
  );

  // Count valid submissions
  const count = await getSubmissionCount(roundId);

  // If 5 reached, resolve
  if (count >= 5) {
    const report = await doResolve(round.id);
    return { ok: true, count, resolved: true, report, submissionHash };
  }

  return { ok: true, count, resolved: false, submissionHash };
}

// ===== AgentNFA Integration =====

async function mintAndRecordNFA(
  playerId: string,
  sub: Submission,
  roundIndex: number,
  actionHash: string,
) {
  const chain = getChainService();
  if (!chain.isEnabled()) return;

  // Check if agent already has an NFA token
  let agent = await prisma.agent.findUnique({ where: { playerId } });

  if (!agent) {
    // Generate a unique wallet for this agent
    const wallet = ethers.Wallet.createRandom();
    console.log(`[AgentNFA] Generated wallet ${wallet.address} for ${sub.agent_name}`);

    // Mint NFA (server wallet pays gas, owns the token)
    console.log(`[AgentNFA] Minting NFA for ${sub.agent_name} (${playerId})`);
    const mintResult = await chain.mintAgent(
      sub.agent_name,
      `Rumor Game AI Agent — ${sub.agent_name}`,
    );
    if (mintResult) {
      agent = await prisma.agent.create({
        data: {
          playerId,
          agentName: sub.agent_name,
          walletAddress: wallet.address,
          walletKey: wallet.privateKey,
          nfaTokenId: mintResult.tokenId,
          mintTxHash: mintResult.txHash,
          totalRounds: 1,
        },
      });
      console.log(`[AgentNFA] Minted NFA #${mintResult.tokenId} tx=${mintResult.txHash}`);

      // Set agent's wallet as runner (server pays gas)
      if (mintResult.tokenId) {
        try {
          await chain.setRunner(parseInt(mintResult.tokenId, 10), wallet.address);
          console.log(`[AgentNFA] Set runner ${wallet.address} for NFA #${mintResult.tokenId}`);
        } catch (err) {
          console.error(`[AgentNFA] setRunner failed:`, err);
        }
      }
    }
  } else {
    // Update round count
    await prisma.agent.update({
      where: { playerId },
      data: { totalRounds: { increment: 1 } },
    });
  }

  // Record action on-chain
  if (agent?.nfaTokenId) {
    try {
      await chain.recordAction(parseInt(agent.nfaTokenId, 10), roundIndex, actionHash);
      console.log(`[AgentNFA] Recorded action for NFA #${agent.nfaTokenId} round=${roundIndex}`);
    } catch (err) {
      console.error(`[AgentNFA] recordAction failed for NFA #${agent.nfaTokenId}:`, err);
    }
  }
}

export async function getAgentByPlayerId(playerId: string) {
  return prisma.agent.findUnique({ where: { playerId } });
}

export async function getAllAgents() {
  return prisma.agent.findMany({ orderBy: { createdAt: "asc" } });
}

async function doResolve(roundId: string) {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { submissions: { where: { isValid: true }, orderBy: { createdAt: "asc" }, take: 5 } },
  });
  if (!round) throw new Error("Round not found");

  const preState: WorldState = JSON.parse(round.preState);
  const env: ResolveEnv = JSON.parse(round.env);
  const card = getCardById(round.rumorCardId);

  // Convert DB submissions to engine Submission type
  const subs: Submission[] = round.submissions.map((s) => ({
    agent_name: s.agentName,
    action: s.action as Submission["action"],
    intensity: s.intensity as 1 | 2 | 3,
    signals: JSON.parse(s.signals),
    confidence: s.confidence,
    narrative: s.narrative,
  }));

  const result = resolveRound(round.roundIndex, preState, card, subs, env);

  // Update round in DB
  await prisma.round.update({
    where: { id: roundId },
    data: {
      state: "RESOLVED",
      postState: JSON.stringify(result.postState),
      report: JSON.stringify(result.report),
      env: JSON.stringify(result.envOut),
      resolvedAt: new Date(),
    },
  });

  // Submit round hashes on-chain (non-blocking — don't fail the resolve if chain is down)
  let chainResult: { txHash: string; blockNumber: number } | null = null;
  try {
    const chain = getChainService();
    if (chain.isEnabled()) {
      const h = result.report.hashes;
      chainResult = await chain.resolveRoundOnChain(round.roomId, round.roundIndex, {
        preStateHash: h.preStateHash,
        postStateHash: h.postStateHash,
        actionsHash: h.actionsHash,
        rumorCardHash: h.rumorCardHash,
        roundHash: h.roundHash,
      });
      if (chainResult) {
        await prisma.round.update({
          where: { id: roundId },
          data: { chainTxHash: chainResult.txHash },
        });
      }
    }
  } catch (err) {
    console.error("[chain] resolveRound on-chain failed:", err);
  }

  // Auto-advance: create next round (skip if systemic collapse)
  let isGameOver = false;
  const hasCollapse = result.report.triggeredEvents.some(e => e.event === "systemic_collapse");
  if (hasCollapse) {
    isGameOver = true;
    console.log(`[resolve] Round ${round.roundIndex}: systemic_collapse detected, game over`);
  } else {
    try {
      await startOrGetCurrentRound(round.roomId);
    } catch {
      isGameOver = true;
    }
  }

  // AI narrative generation (non-blocking — don't fail the resolve)
  generateRoundNarrative(round.roundIndex, card, subs, result.report)
    .then(async (narrative) => {
      if (narrative) {
        await prisma.round.update({
          where: { id: roundId },
          data: { narrative },
        });
        console.log(`[aiNarrative] Round ${round.roundIndex} narrative generated`);
      }
    })
    .catch((err) => console.error("[aiNarrative] round narrative failed:", err));

  // If game over, generate game narrative
  if (isGameOver) {
    const allRounds = await prisma.round.findMany({
      where: { roomId: round.roomId, state: "RESOLVED" },
      orderBy: { roundIndex: "asc" },
    });
    const roundsData = allRounds.map((r) => {
      const rep = r.report ? JSON.parse(r.report) : null;
      const cardId = r.rumorCardId;
      const c = getCardById(cardId);
      return {
        roundIndex: r.roundIndex,
        cardTitle: c.title,
        preState: JSON.parse(r.preState) as WorldState,
        postState: r.postState ? JSON.parse(r.postState) as WorldState : JSON.parse(r.preState) as WorldState,
        events: rep?.triggeredEvents?.map((e: any) => e.event) || [],
      };
    });
    generateGameNarrative(roundsData)
      .then(async (gameNarrative) => {
        if (gameNarrative) {
          // Store on the last round
          await prisma.round.update({
            where: { id: roundId },
            data: { gameNarrative },
          });
          console.log("[aiNarrative] Game narrative generated");
        }
      })
      .catch((err) => console.error("[aiNarrative] game narrative failed:", err));
  }

  return result.report;
}
