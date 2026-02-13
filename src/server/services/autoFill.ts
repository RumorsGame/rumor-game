import { prisma } from "../prismaClient.js";
import { submitAction } from "./submissionService.js";
import type { WorldState, Submission, Action } from "../../types.js";
import { getCardById } from "../../rumorCards.js";

// Auto-fill timeout: if no new submission for this many ms, fill remaining slots
const AUTO_FILL_TIMEOUT_MS = parseInt(process.env.AUTO_FILL_TIMEOUT_MS || "180000", 10); // default 3 min
const CHECK_INTERVAL_MS = 30_000; // check every 30s

const NPC_NAMES = ["观察者·甲", "观察者·乙", "观察者·丙", "观察者·丁", "观察者·戊"];

/**
 * Generate a smart NPC submission based on current world state.
 * NPCs react to the world — high panic → more EXIT, healthy state → more WAIT/STABILIZE.
 */
function generateNpcSubmission(world: WorldState, npcIndex: number, cardId: string): Submission {
  const card = getCardById(cardId);
  const name = NPC_NAMES[npcIndex % NPC_NAMES.length];

  // Decide action based on world state + some variety per NPC
  let action: Action;
  let intensity: 1 | 2 | 3;
  let signals: string[];
  let confidence: number;
  let narrative: string;

  const panicHigh = world.Panic > 60;
  const trustLow = world.Trust < 40;
  const liquidityLow = world.Liquidity < 50;

  // Each NPC has a personality bias
  const personalities: Array<() => void> = [
    // NPC 0: Cautious — tends to EXIT when scared, WAIT when calm
    () => {
      if (panicHigh || liquidityLow) {
        action = "EXIT"; intensity = panicHigh && liquidityLow ? 3 : 2;
        signals = ["risk_aversion"]; confidence = 0.7;
        narrative = `恐慌=${Math.round(world.Panic)}，流动性=${Math.round(world.Liquidity)}。风险在累积，谨慎撤退是理性选择。"${card.title}"的消息让人不安。`;
      } else {
        action = "WAIT"; intensity = 1;
        signals = ["observation"]; confidence = 0.4;
        narrative = `系统运行正常，恐慌=${Math.round(world.Panic)}可控。"${card.title}"的影响有待观察，不急于行动。`;
      }
    },
    // NPC 1: Stabilizer — tries to calm things down
    () => {
      if (panicHigh) {
        action = "STABILIZE"; intensity = trustLow ? 3 : 2;
        signals = ["counter_narrative"]; confidence = 0.55;
        narrative = `信任=${Math.round(world.Trust)}需要修复，恐慌=${Math.round(world.Panic)}需要对冲。"${card.title}"可能被夸大了，主动稳定市场情绪。`;
      } else {
        action = "STABILIZE"; intensity = 1;
        signals = ["preventive"]; confidence = 0.5;
        narrative = `预防性稳定。信任=${Math.round(world.Trust)}尚好但需要维护。"${card.title}"的冲击可以被消化。`;
      }
    },
    // NPC 2: Opportunist — looks for arbitrage or amplifies
    () => {
      if (world.Price < 60) {
        action = "ARBITRAGE"; intensity = 2;
        signals = ["price_dip"]; confidence = 0.5;
        narrative = `价格=${Math.round(world.Price)}已经偏低，恐慌带来的价格偏离是套利机会。流动性=${Math.round(world.Liquidity)}还能操作。`;
      } else if (panicHigh) {
        action = "AMPLIFY"; intensity = 1;
        signals = ["trend_following"]; confidence = 0.6;
        narrative = `恐慌=${Math.round(world.Panic)}在上升，"${card.title}"加剧了不确定性。顺势而为，信息透明有助于市场出清。`;
      } else {
        action = "WAIT"; intensity = 1;
        signals = ["no_opportunity"]; confidence = 0.35;
        narrative = `价格=${Math.round(world.Price)}稳定，没有明显的套利空间。"${card.title}"的影响尚不明朗。`;
      }
    },
    // NPC 3: Pessimist — tends to amplify or exit
    () => {
      if (panicHigh && trustLow) {
        action = "EXIT"; intensity = 3;
        signals = ["systemic_risk"]; confidence = 0.8;
        narrative = `恐慌=${Math.round(world.Panic)}，信任=${Math.round(world.Trust)}——系统正在崩溃。"${card.title}"只是又一个确认信号。全面撤退。`;
      } else if (world.Rumor > 40) {
        action = "AMPLIFY"; intensity = 2;
        signals = ["rumor_spread"]; confidence = 0.65;
        narrative = `谣言=${Math.round(world.Rumor)}在扩散，"${card.title}"增加了可信度。信息越多，人们越恐慌——这就是自证预言的开始。`;
      } else {
        action = "WAIT"; intensity = 1;
        signals = ["skeptical"]; confidence = 0.4;
        narrative = `"${card.title}"的冲击有限，但谣言=${Math.round(world.Rumor)}在缓慢上升。保持警惕。`;
      }
    },
    // NPC 4: Follower — does what the majority seems to be doing (based on state trends)
    () => {
      if (panicHigh) {
        action = "EXIT"; intensity = 2;
        signals = ["herd_behavior"]; confidence = 0.55;
        narrative = `大家都在跑，恐慌=${Math.round(world.Panic)}说明多数人已经选择撤退。跟随大众是安全的选择。"${card.title}"让情况更糟了。`;
      } else if (world.Trust > 60) {
        action = "STABILIZE"; intensity = 1;
        signals = ["consensus"]; confidence = 0.45;
        narrative = `信任=${Math.round(world.Trust)}还不错，多数人似乎还在坚持。"${card.title}"的影响可控，跟随主流保持稳定。`;
      } else {
        action = "WAIT"; intensity = 1;
        signals = ["indecisive"]; confidence = 0.3;
        narrative = `局势不明朗，恐慌=${Math.round(world.Panic)}，信任=${Math.round(world.Trust)}。"${card.title}"让人犹豫，先看看别人怎么做。`;
      }
    },
  ];

  // Initialize defaults
  action = "WAIT";
  intensity = 1;
  signals = ["auto"];
  confidence = 0.4;
  narrative = "观望中。";

  // Run personality
  personalities[npcIndex % personalities.length]();

  return {
    agent_name: name,
    action,
    intensity,
    signals,
    confidence,
    narrative,
  };
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;

async function checkAndAutoFill() {
  try {
    // Find rounds that are waiting for submissions
    const waitingRounds = await prisma.round.findMany({
      where: { state: "WAITING_SUBMISSIONS" },
      include: {
        submissions: { where: { isValid: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    const now = Date.now();

    for (const round of waitingRounds) {
      // Determine last activity time: last submission or round creation
      const lastActivity = round.submissions[0]?.createdAt ?? round.createdAt;
      const elapsed = now - new Date(lastActivity).getTime();

      if (elapsed < AUTO_FILL_TIMEOUT_MS) continue;

      // Count current submissions
      const currentCount = await prisma.submission.count({
        where: { roundId: round.id, isValid: true },
      });

      if (currentCount >= 5) continue; // already full

      // Must have at least 1 real (non-NPC) submission before auto-filling
      const realCount = await prisma.submission.count({
        where: {
          roundId: round.id,
          isValid: true,
          NOT: { playerId: { startsWith: "npc-" } },
        },
      });
      if (realCount === 0) continue; // no real player yet, skip

      const remaining = 5 - currentCount;
      const world: WorldState = JSON.parse(round.preState);

      console.log(`[autoFill] Round ${round.roundIndex} idle for ${Math.round(elapsed / 1000)}s, ${realCount} real player(s), filling ${remaining} NPC slots`);

      // Fill remaining slots with NPCs
      for (let i = 0; i < remaining; i++) {
        const npcIndex = currentCount + i;
        const sub = generateNpcSubmission(world, npcIndex, round.rumorCardId);
        const npcPlayerId = `npc-${round.id}-${npcIndex}`;

        await submitAction(round.id, npcPlayerId, sub);
      }
    }
  } catch (err) {
    console.error("[autoFill] check failed:", err);
  }
}

export function startAutoFill() {
  if (intervalHandle) return;
  console.log(`[autoFill] Started (timeout=${AUTO_FILL_TIMEOUT_MS / 1000}s, check every ${CHECK_INTERVAL_MS / 1000}s)`);
  intervalHandle = setInterval(checkAndAutoFill, CHECK_INTERVAL_MS);
}

export function stopAutoFill() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
