// Submit 5 agents with proper UTF-8 narratives
const ROOM_ID = process.argv[2];
const API = "http://localhost:3000";

const submissions = [
  {
    playerId: "agent_alpha",
    submission: {
      agent_name: "Alpha",
      action: "AMPLIFY",
      intensity: 2,
      signals: ["rumor_spread", "ai_generated"],
      confidence: 0.7,
      narrative: "当前Rumor=40处于中低水平，但AI批量攻击的消息一旦扩散将迅速放大恐慌情绪。Panic=68已经偏高，信息污染会进一步侵蚀Trust=55的脆弱基础。选择AMPLIFY是因为在Rumor突破60之前主动加码，可以在散户恐慌性抛售时获取超额收益。Load=60说明系统承压能力尚可，短期内不会崩溃。"
    }
  },
  {
    playerId: "agent_bravo",
    submission: {
      agent_name: "Bravo",
      action: "STABILIZE",
      intensity: 2,
      signals: ["counter_narrative", "trust_repair"],
      confidence: 0.6,
      narrative: "AI攻击谣言的可信度仅0.50，当前Trust=55仍有修复空间。Panic=68虽然偏高但尚未失控，及时发布反叙事可以遏制恐慌蔓延。Liquidity=72表明市场流动性充足，这为稳定操作提供了良好基础。选择STABILIZE重点关注Trust能否回升到60以上，同时防止Rumor进一步扩散。"
    }
  },
  {
    playerId: "agent_charlie",
    submission: {
      agent_name: "Charlie",
      action: "WAIT",
      intensity: 1,
      signals: ["uncertainty", "observation"],
      confidence: 0.4,
      narrative: "AI攻击的真实规模尚不确定，credibility仅0.50说明消息源不够可靠。当前Price=70维持平稳，Loss=10处于低位，不必急于行动。Panic=68确实偏高但Load=60显示系统仍在正常运转。选择观望等待更多信息，下一回合再根据Rumor走势决定是否介入。"
    }
  },
  {
    playerId: "agent_delta",
    submission: {
      agent_name: "Delta",
      action: "EXIT",
      intensity: 1,
      signals: ["panic_rising", "risk_aversion"],
      confidence: 0.5,
      narrative: "Panic=68已接近危险区域，AI批量攻击如果被证实将推动恐慌突破80以上。Liquidity=72虽然目前充足但一旦挤兑开始会迅速枯竭。Trust=55处于中性偏低水平，缺乏足够的社会信任来抵御冲击。选择EXIT是风险管理的审慎决策，保全资产等待局势明朗后再重新入场。"
    }
  },
  {
    playerId: "agent_echo",
    submission: {
      agent_name: "Echo",
      action: "ARBITRAGE",
      intensity: 1,
      signals: ["info_warfare", "price_gap"],
      confidence: 0.55,
      narrative: "信息战已经开始，Rumor=40是低估的起点，Load=60说明系统正在承压但尚未过载。Price=70与实际风险之间存在定价偏差，这正是套利机会。Trust=55的不确定性会制造波动，而波动就是利润来源。选择ARBITRAGE在恐慌与理性之间寻找价差，用信息优势获取收益。"
    }
  }
];

async function submit(s) {
  const res = await fetch(`${API}/api/rooms/${ROOM_ID}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(s)
  });
  const json = await res.json();
  console.log(`${s.submission.agent_name} (${s.submission.action}): ${json.ok ? "OK" : "FAIL"} - ${json.ok ? json.submissionsCount + "/5" : JSON.stringify(json.errors)}`);
  return json;
}

async function main() {
  for (const s of submissions) {
    await submit(s);
  }
}
main();
