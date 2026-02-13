import { DEFAULT_WORLD, type WorldState, type ResolveEnv } from "./types.js";
import { drawCard, STORY_ORDER } from "./rumorCards.js";
import { resolveRound } from "./engine.js";
import { STORY_SUBMISSIONS } from "./storyMode.js";

// ===== Pretty Printers =====

function stateBar(label: string, value: number, width = 30): string {
  const v = Math.round(value);
  const filled = Math.round((v / 100) * width);
  const bar = "█".repeat(filled) + "░".repeat(width - filled);
  return `  ${label.padEnd(10)} ${bar} ${v}`;
}

function printState(title: string, s: WorldState): void {
  console.log(`\n  ${title}`);
  console.log(stateBar("Panic", s.Panic));
  console.log(stateBar("Trust", s.Trust));
  console.log(stateBar("Liquidity", s.Liquidity));
  console.log(stateBar("Load", s.Load));
  console.log(stateBar("Rumor", s.Rumor));
  console.log(stateBar("Price", s.Price));
  console.log(stateBar("Loss", s.Loss));
}

function printDelta(delta: WorldState): void {
  console.log("\n  变化量 (Delta):");
  for (const [k, v] of Object.entries(delta)) {
    const sign = v > 0 ? "+" : "";
    const arrow = v > 0 ? "↑" : v < 0 ? "↓" : "─";
    console.log(`    ${k.padEnd(10)} ${arrow} ${sign}${v}`);
  }
}

// ===== Main =====

function main(): void {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║   如果谣言是真的，会发生什么？ — Story Mode (6 Rounds)  ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  let state: WorldState = { ...DEFAULT_WORLD };
  let env: ResolveEnv = { nextShockBonus: 0 };

  for (let i = 0; i < STORY_ORDER.length; i++) {
    const card = drawCard("story", i);
    const submissions = STORY_SUBMISSIONS[i];

    console.log(`\n${"═".repeat(60)}`);
    console.log(`  回合 ${i + 1} / ${STORY_ORDER.length}`);
    console.log(`${"═".repeat(60)}`);

    // Rumor Card
    console.log(`\n  📰 谣言卡: [${card.id}] ${card.title}`);
    console.log(`  "${card.rumor_text}"`);
    console.log(`  shock=${card.shock}  credibility=${card.credibility}  focus=${card.focus.join(",")}`);
    if (env.nextShockBonus > 0) {
      console.log(`  ⚡ 上轮 rumor_viral 加成: shock+${env.nextShockBonus}`);
    }

    // Pre-state
    printState("结算前 (Pre-State)", state);

    // Actions summary
    console.log("\n  🎭 玩家动作:");
    for (const sub of submissions) {
      console.log(`    ${sub.agent_name.padEnd(8)} → ${sub.action.padEnd(10)} intensity=${sub.intensity}  confidence=${sub.confidence}  signals=[${sub.signals.join(",")}]`);
    }

    // Resolve
    const result = resolveRound(i, state, card, submissions, env);

    // Post-state
    printState("结算后 (Post-State)", result.report.postState);
    printDelta(result.report.delta);

    // Triggered events
    if (result.report.triggeredEvents.length > 0) {
      console.log("\n  ⚠️  触发事件:");
      for (const ev of result.report.triggeredEvents) {
        console.log(`    [${ev.event}] ${ev.detail}`);
      }
    } else {
      console.log("\n  ✅ 无阈值事件触发");
    }

    // Narrative highlights
    console.log("\n  💬 叙事摘要 (Top 3):");
    for (const n of result.report.narrativeHighlights) {
      console.log(`    "${n}"`);
    }

    // Hash
    console.log(`\n  🔗 roundHash: ${result.report.hashes.roundHash}`);

    // Advance
    state = result.postState;
    env = result.envOut;
  }

  // Final summary
  console.log(`\n${"═".repeat(60)}`);
  console.log("  📊 最终世界状态");
  console.log(`${"═".repeat(60)}`);
  printState("Final State", state);

  // Self-fulfilling verdict
  if (state.Panic > 80 && state.Trust < 40 && state.Rumor > 60) {
    console.log("\n  🔴 结论: 自证预言已完全实现 — 谣言成为了现实。");
  } else if (state.Panic > 60) {
    console.log("\n  🟡 结论: 社会处于高度紧张状态，但尚未完全崩溃。");
  } else {
    console.log("\n  🟢 结论: 社会成功抵御了谣言冲击。");
  }

  console.log("\n  游戏结束。每一个选择都塑造了这个世界。\n");
}

main();
