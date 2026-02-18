import { Router } from "express";
import { createRoomSchema, submitSchema, validateNarrativeRefs } from "../validation.js";
import * as roomService from "../services/roomService.js";
import * as submissionService from "../services/submissionService.js";
import { getAgentByPlayerId, getAllAgents, getAgentActionStats } from "../services/submissionService.js";
import { getCardById } from "../../rumorCards.js";
import { getChainService } from "../services/chainService.js";
import type { WorldState, ResolveEnv } from "../../types.js";

export const roomsRouter = Router();

// GET /api/rooms/history — list all completed games
roomsRouter.get("/history", async (_req, res) => {
  try {
    const rooms = await roomService.getAllGames();
    res.json({ games: rooms });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/rooms/default — get or create the single default room
roomsRouter.get("/default", async (_req, res) => {
  try {
    const { room, roomId, gameOver } = await roomService.getOrCreateDefaultRoom();

    if (gameOver) {
      // Return game over state with last round info for the frontend to display
      const rounds = await roomService.getRoundsByRoom(roomId);
      const lastRound = rounds[rounds.length - 1];
      const lastReport = lastRound?.report ? JSON.parse(lastRound.report) : null;
      res.json({
        roomId,
        gameOver: true,
        roundIndex: lastRound?.roundIndex ?? 0,
        report: lastReport,
        narrative: (lastRound as any)?.narrative || null,
        gameNarrative: (lastRound as any)?.gameNarrative || null,
        message: lastReport?.triggeredEvents?.some((e: any) => e.event === "systemic_collapse")
          ? "系统性崩溃"
          : "所有回合已完成",
      });
      return;
    }

    const round = await roomService.startOrGetCurrentRound(roomId);
    if (!round) {
      res.json({ roomId, gameOver: true, message: "All rounds completed" });
      return;
    }
    const card = getCardById(round.rumorCardId);
    const preState: WorldState = JSON.parse(round.preState);
    const count = await submissionService.getSubmissionCount(round.id);

    const roundPack = {
      round: round.roundIndex,
      mode: room.mode,
      rumor_card: card,
      world: preState,
      rules: { output_schema_version: "1.0", note: "输出必须JSON并遵守skill.md" },
    };

    res.json({
      roomId,
      mode: room.mode,
      roundId: round.id,
      roundIndex: round.roundIndex,
      roundState: round.state,
      submissionsCount: count,
      roundPack,
      report: round.report ? JSON.parse(round.report) : null,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/rooms/new-game — start a fresh game
roomsRouter.post("/new-game", async (req, res) => {
  try {
    const m = req.body?.mode;
    const mode = (m === "chaos" || m === "survival") ? m : "story";
    const { room, roomId } = await roomService.createNewGame(mode);
    const round = await roomService.startOrGetCurrentRound(roomId);
    res.json({ roomId, mode, roundIndex: round?.roundIndex ?? 0, message: "新游戏已创建" });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/rooms — create room
roomsRouter.post("/", async (req, res) => {
  const parsed = createRoomSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const room = await roomService.createRoom(parsed.data.mode);
  res.json({ roomId: room.id });
});

// POST /api/rooms/:roomId/start — start or get current round
roomsRouter.post("/:roomId/start", async (req, res) => {
  try {
    const round = await roomService.startOrGetCurrentRound(req.params.roomId);
    if (!round) {
      res.json({ gameOver: true, message: "All rounds completed" });
      return;
    }
    const card = getCardById(round.rumorCardId);
    const preState: WorldState = JSON.parse(round.preState);
    const env: ResolveEnv = JSON.parse(round.env);

    const roundPack = {
      round: round.roundIndex,
      mode: "story",
      rumor_card: card,
      world: preState,
      rules: { output_schema_version: "1.0", note: "输出必须JSON并遵守skill.md" },
    };

    res.json({
      roundId: round.id,
      roundIndex: round.roundIndex,
      state: round.state,
      roundPack,
    });
  } catch (e: any) {
    res.status(404).json({ error: e.message });
  }
});

// GET /api/rooms/:roomId/current — current round status
roomsRouter.get("/:roomId/current", async (req, res) => {
  const room = await roomService.getRoom(req.params.roomId);
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }

  const rounds = room.rounds;
  const current = rounds.find((r) => r.state === "WAITING_SUBMISSIONS")
    || rounds[rounds.length - 1];

  if (!current) {
    res.json({ roomId: room.id, mode: room.mode, noRounds: true });
    return;
  }

  const card = getCardById(current.rumorCardId);
  const preState: WorldState = JSON.parse(current.preState);
  const count = await submissionService.getSubmissionCount(current.id);

  const roundPack = {
    round: current.roundIndex,
    mode: room.mode,
    rumor_card: card,
    world: preState,
    rules: { output_schema_version: "1.0", note: "输出必须JSON并遵守skill.md" },
  };

  res.json({
    roomId: room.id,
    mode: room.mode,
    roundId: current.id,
    roundIndex: current.roundIndex,
    roundState: current.state,
    submissionsCount: count,
    roundPack,
    report: current.report ? JSON.parse(current.report) : null,
  });
});

// POST /api/rooms/:roomId/submit — player submits action
roomsRouter.post("/:roomId/submit", async (req, res) => {
  // Validate body
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, isValid: false, errors: parsed.error.flatten().fieldErrors });
    return;
  }

  const { playerId, submission } = parsed.data;

  // Validate narrative refs
  const narrativeErrors = validateNarrativeRefs(submission.narrative);
  if (narrativeErrors.length > 0) {
    res.status(400).json({ ok: false, isValid: false, errors: narrativeErrors });
    return;
  }

  // Find current waiting round
  const room = await roomService.getRoom(req.params.roomId);
  if (!room) { res.status(404).json({ ok: false, errors: ["Room not found"] }); return; }

  const currentRound = room.rounds.find((r) => r.state === "WAITING_SUBMISSIONS");
  if (!currentRound) {
    res.status(400).json({ ok: false, errors: ["No active round (all resolved or game over)"] });
    return;
  }

  const result = await submissionService.submitAction(currentRound.id, playerId, submission);

  if (!result.ok) {
    res.status(400).json({ ok: false, isValid: false, errors: result.errors });
    return;
  }

  res.json({
    ok: true,
    isValid: true,
    submissionsCount: result.count,
    resolved: result.resolved,
    submissionHash: result.submissionHash,
    report: result.report || null,
  });
});

// GET /api/rooms/:roomId/rounds — all rounds
roomsRouter.get("/:roomId/rounds", async (req, res) => {
  const rounds = await roomService.getRoundsByRoom(req.params.roomId);
  const summaries = rounds.map((r) => ({
    roundIndex: r.roundIndex,
    rumorCardId: r.rumorCardId,
    state: r.state,
    submissionsCount: r.submissions.length,
    resolvedAt: r.resolvedAt,
    report: r.report ? JSON.parse(r.report) : null,
    narrative: (r as any).narrative || null,
    gameNarrative: (r as any).gameNarrative || null,
  }));
  res.json({ rounds: summaries });
});

// GET /api/rooms/:roomId/rounds/:roundIndex — round detail
roomsRouter.get("/:roomId/rounds/:roundIndex", async (req, res) => {
  const roundIndex = parseInt(req.params.roundIndex, 10);
  if (isNaN(roundIndex)) { res.status(400).json({ error: "Invalid roundIndex" }); return; }

  const round = await roomService.getRoundDetail(req.params.roomId, roundIndex);
  if (!round) { res.status(404).json({ error: "Round not found" }); return; }

  // Enrich submissions with NFA tokenId
  const submissions = await Promise.all(
    round.submissions.map(async (s) => {
      const agent = await getAgentByPlayerId(s.playerId);
      return {
        playerId: s.playerId,
        agentName: s.agentName,
        action: s.action,
        intensity: s.intensity,
        signals: JSON.parse(s.signals),
        confidence: s.confidence,
        narrative: s.narrative,
        createdAt: s.createdAt,
        nfaTokenId: agent?.nfaTokenId || null,
        walletAddress: agent?.walletAddress || null,
      };
    }),
  );

  res.json({
    roundIndex: round.roundIndex,
    rumorCardId: round.rumorCardId,
    state: round.state,
    preState: JSON.parse(round.preState),
    postState: round.postState ? JSON.parse(round.postState) : null,
    report: round.report ? JSON.parse(round.report) : null,
    chainTxHash: (round as any).chainTxHash || null,
    narrative: (round as any).narrative || null,
    gameNarrative: (round as any).gameNarrative || null,
    submissions,
  });
});

// GET /api/rooms/:roomId/rounds/:roundIndex/chain — on-chain verification
roomsRouter.get("/:roomId/rounds/:roundIndex/chain", async (req, res) => {
  const roundIndex = parseInt(req.params.roundIndex, 10);
  if (isNaN(roundIndex)) { res.status(400).json({ error: "Invalid roundIndex" }); return; }

  const round = await roomService.getRoundDetail(req.params.roomId, roundIndex);
  if (!round) { res.status(404).json({ error: "Round not found" }); return; }

  const chain = getChainService();
  if (!chain.isEnabled()) {
    res.json({ enabled: false, message: "Chain integration not configured" });
    return;
  }

  const report = round.report ? JSON.parse(round.report) : null;
  if (!report?.hashes?.roundHash) {
    res.json({ enabled: true, verified: false, message: "Round not yet resolved" });
    return;
  }

  try {
    const onChainData = await chain.getRoundOnChain(req.params.roomId, roundIndex);
    const verified = await chain.verifyRoundHash(req.params.roomId, roundIndex, report.hashes.roundHash);

    res.json({
      enabled: true,
      verified,
      chainTxHash: (round as any).chainTxHash || null,
      onChain: onChainData ? {
        preStateHash: onChainData.preStateHash,
        postStateHash: onChainData.postStateHash,
        roundHash: onChainData.roundHash,
        timestamp: onChainData.timestamp?.toString(),
      } : null,
      offChain: report.hashes,
    });
  } catch (err: any) {
    res.json({ enabled: true, verified: false, error: err.message });
  }
});

// ===== AgentNFA Endpoints =====

// GET /api/rooms/agents — list all minted agents
roomsRouter.get("/agents", async (_req, res) => {
  try {
    const agents = await getAllAgents();
    const chain = getChainService();
    const enriched = await Promise.all(
      agents.map(async (a) => {
        let onChainState = null;
        if (chain.isEnabled() && a.nfaTokenId) {
          try {
            const state = await chain.getAgentState(parseInt(a.nfaTokenId, 10));
            if (state) {
              onChainState = {
                status: Number(state.status),
                totalRounds: Number(state.totalRounds),
                lastActionTs: Number(state.lastActionTs),
              };
            }
          } catch { /* ignore */ }
        }
        const stats = await getAgentActionStats(a.playerId);
        return {
          playerId: a.playerId,
          agentName: a.agentName,
          walletAddress: a.walletAddress,
          nfaTokenId: a.nfaTokenId,
          mintTxHash: a.mintTxHash,
          totalRounds: a.totalRounds,
          onChainState,
          actionCounts: stats.actionCounts,
          avgIntensity: stats.avgIntensity,
          avgConfidence: stats.avgConfidence,
        };
      }),
    );
    res.json({ agents: enriched });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/rooms/agents/:playerId — single agent NFA info
roomsRouter.get("/agents/:playerId", async (req, res) => {
  try {
    const agent = await getAgentByPlayerId(req.params.playerId);
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    const chain = getChainService();
    let onChainState = null;
    let onChainMeta = null;
    if (chain.isEnabled() && agent.nfaTokenId) {
      const tokenId = parseInt(agent.nfaTokenId, 10);
      try {
        const state = await chain.getAgentState(tokenId);
        if (state) {
          onChainState = {
            status: Number(state.status),
            totalRounds: Number(state.totalRounds),
            lastActionTs: Number(state.lastActionTs),
          };
        }
      } catch { /* ignore */ }
      try {
        const meta = await chain.getAgentMetadata(tokenId);
        if (meta) {
          onChainMeta = {
            persona: meta.persona,
            experience: meta.experience,
            version: meta.version,
          };
        }
      } catch { /* ignore */ }
    }
    res.json({
      playerId: agent.playerId,
      agentName: agent.agentName,
      walletAddress: agent.walletAddress,
      nfaTokenId: agent.nfaTokenId,
      mintTxHash: agent.mintTxHash,
      totalRounds: agent.totalRounds,
      onChainState,
      onChainMeta,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
