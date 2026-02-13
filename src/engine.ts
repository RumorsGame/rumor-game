import type {
  WorldState, RumorCard, Submission, ResolveEnv,
  ResolveResult, RoundReport, RoundHashes,
  TriggeredEvent, ActionsSummary, WORLD_KEYS,
} from "./types.js";
import { createHash } from "node:crypto";

// ===== Helpers =====

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function clampState(s: WorldState): WorldState {
  return {
    Panic: clamp(s.Panic),
    Trust: clamp(s.Trust),
    Liquidity: clamp(s.Liquidity),
    Load: clamp(s.Load),
    Rumor: clamp(s.Rumor),
    Price: clamp(s.Price),
    Loss: clamp(s.Loss),
  };
}

function copyState(s: WorldState): WorldState {
  return { ...s };
}

function deltaState(pre: WorldState, post: WorldState): WorldState {
  return {
    Panic: +(post.Panic - pre.Panic).toFixed(2),
    Trust: +(post.Trust - pre.Trust).toFixed(2),
    Liquidity: +(post.Liquidity - pre.Liquidity).toFixed(2),
    Load: +(post.Load - pre.Load).toFixed(2),
    Rumor: +(post.Rumor - pre.Rumor).toFixed(2),
    Price: +(post.Price - pre.Price).toFixed(2),
    Loss: +(post.Loss - pre.Loss).toFixed(2),
  };
}

function canonicalJSON(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as object).sort());
}

function sha256(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

// ===== Settlement Engine =====

export function resolveRound(
  roundIndex: number,
  preState: WorldState,
  rumorCard: RumorCard,
  submissions: Submission[],
  envIn: ResolveEnv,
): ResolveResult {
  const events: TriggeredEvent[] = [];
  const s = copyState(preState);
  const env: ResolveEnv = { ...envIn };

  // Apply nextShockBonus from previous round's rumor_viral
  const effectiveShock = rumorCard.shock + env.nextShockBonus;
  env.nextShockBonus = 0; // consumed

  // --- (1) Rumor base shock (reduced: rumor spreads info, not direct panic) ---
  s.Panic += effectiveShock * 0.3;
  s.Rumor += effectiveShock * rumorCard.credibility;
  s.Trust -= effectiveShock * 0.15;

  // --- (2) Accumulate action weights ---
  for (const sub of submissions) {
    const i = sub.intensity;
    switch (sub.action) {
      case "EXIT":
        s.Panic += 3 * i;
        s.Trust -= 2 * i;
        s.Liquidity -= 4 * i;
        s.Load += 2 * i;
        break;
      case "AMPLIFY":
        s.Rumor += 4 * i;
        s.Panic += 2 * i;
        s.Trust -= 1 * i;
        break;
      case "STABILIZE":
        s.Panic -= 3 * i;
        s.Trust += 3 * i;
        s.Load -= 2 * i;
        break;
      case "WAIT":
        s.Panic += 1 * i;
        s.Rumor += 0.5 * i;
        break;
      case "ARBITRAGE":
        s.Liquidity -= 2 * i;
        s.Load += 3 * i;
        s.Panic += 1;
        break;
    }
  }

  // --- (3) Price / Loss ---
  let exitIntensitySum = 0;
  let arbIntensitySum = 0;
  let stabIntensitySum = 0;
  for (const sub of submissions) {
    if (sub.action === "EXIT") exitIntensitySum += sub.intensity;
    if (sub.action === "ARBITRAGE") arbIntensitySum += sub.intensity;
    if (sub.action === "STABILIZE") stabIntensitySum += sub.intensity;
  }

  const priceChange =
    -2 * exitIntensitySum
    - 1 * arbIntensitySum
    + 2 * stabIntensitySum
    - s.Panic * 0.03
    + s.Trust * 0.02;

  s.Price += priceChange;

  if (s.Price < 60) {
    s.Loss += (60 - s.Price) * 0.5;
  }
  s.Panic += s.Loss * 0.03;

  // --- (4) Negative threshold events ---
  if (s.Liquidity < 50) {
    s.Panic += 5;
    events.push({ event: "liquidity_crunch", detail: `流动性=${s.Liquidity.toFixed(1)} < 50 → 恐慌+5` });
  }
  if (s.Load > 80) {
    s.Trust -= 5;
    events.push({ event: "overload_trust_drop", detail: `负载=${s.Load.toFixed(1)} > 80 → 信任-5` });
  }
  if (s.Rumor > 60) {
    env.nextShockBonus += 3;
    events.push({ event: "rumor_viral", detail: `谣言=${s.Rumor.toFixed(1)} > 60 → 下回合冲击+3` });
  }

  // --- (4b) Positive threshold events ---
  if (s.Trust > 70) {
    s.Panic -= 3;
    events.push({ event: "collective_confidence", detail: `信任=${s.Trust.toFixed(1)} > 70 → 恐慌-3 集体信心恢复` });
  }
  if (s.Panic < 30 && s.Trust > 50) {
    s.Trust += 2;
    events.push({ event: "calm_restored", detail: `恐慌=${s.Panic.toFixed(1)} < 30 → 信任+2 市场回归理性` });
  }
  if (s.Liquidity > 75) {
    s.Price += 2;
    events.push({ event: "market_stable", detail: `流动性=${s.Liquidity.toFixed(1)} > 75 → 价格+2 市场稳定信号` });
  }

  // --- (5) Self-fulfilling loop ---
  if (s.Panic > 80 && s.Trust < 40 && s.Rumor > 60) {
    s.Panic += 3;
    s.Trust -= 2;
    s.Rumor += 2;
    events.push({
      event: "self_fulfilling_loop",
      detail: `恐慌=${s.Panic.toFixed(1)} 信任=${s.Trust.toFixed(1)} 谣言=${s.Rumor.toFixed(1)} → 自证循环触发`,
    });
  }
  if (s.Loss > 40 && s.Panic > 80) {
    s.Price -= 3;
    events.push({
      event: "loss_spiral",
      detail: `损失=${s.Loss.toFixed(1)} & 恐慌=${s.Panic.toFixed(1)} → 价格-3 亏损螺旋`,
    });
  }

  // --- (5b) Early collapse detection ---
  if (s.Liquidity <= 5 || (s.Panic >= 95 && s.Trust <= 5)) {
    events.push({
      event: "systemic_collapse",
      detail: `系统性崩溃：流动性=${s.Liquidity.toFixed(1)} 恐慌=${s.Panic.toFixed(1)} 信任=${s.Trust.toFixed(1)}`,
    });
  }

  // --- (6) Clamp ---
  const postState = clampState(s);

  // --- Build actions summary ---
  const actionsSummary: ActionsSummary = {};
  for (const sub of submissions) {
    if (!actionsSummary[sub.action]) {
      actionsSummary[sub.action] = { count: 0, totalIntensity: 0 };
    }
    actionsSummary[sub.action].count++;
    actionsSummary[sub.action].totalIntensity += sub.intensity;
  }

  // --- Narrative highlights (pick up to 3 by highest confidence) ---
  const sorted = [...submissions].sort((a, b) => b.confidence - a.confidence);
  const narrativeHighlights = sorted.slice(0, 3).map((s) => s.narrative);

  // --- (8) Hashes ---
  const preStateHash = sha256(canonicalJSON(preState));
  const postStateHash = sha256(canonicalJSON(postState));
  const rumorCardHash = sha256(canonicalJSON(rumorCard));
  const sortedSubs = [...submissions].sort((a, b) => a.agent_name.localeCompare(b.agent_name));
  const subsForHash = sortedSubs.map((s) => ({
    agent_name: s.agent_name,
    action: s.action,
    intensity: s.intensity,
    signals: s.signals,
    confidence: s.confidence,
  }));
  const actionsHash = sha256(canonicalJSON(subsForHash));
  const roundHash = sha256(preStateHash + rumorCardHash + actionsHash + postStateHash);

  const hashes: RoundHashes = { preStateHash, postStateHash, actionsHash, roundHash, rumorCardHash };

  const report: RoundReport = {
    roundIndex,
    rumorCardId: rumorCard.id,
    preState: copyState(preState),
    postState,
    delta: deltaState(preState, postState),
    actionsSummary,
    triggeredEvents: events,
    narrativeHighlights,
    hashes,
  };

  return { postState, report, envOut: env };
}
