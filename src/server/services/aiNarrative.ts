import type { WorldState, RumorCard, Submission, RoundReport } from "../../types.js";

const API_KEY = process.env.CLAUDE_API_KEY || "";
const BASE_URL = process.env.CLAUDE_BASE_URL || "https://api.anthropic.com";
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-5";

function isEnabled(): boolean {
  return !!API_KEY;
}

async function callClaude(system: string, user: string): Promise<string> {
  const url = `${BASE_URL}/v1/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[aiNarrative] Claude API error:", res.status, text);
    return "";
  }

  const json = await res.json() as any;
  return json.content?.[0]?.text || "";
}

/**
 * Generate a narrative summary for a single round.
 */
export async function generateRoundNarrative(
  roundIndex: number,
  card: RumorCard,
  submissions: Submission[],
  report: RoundReport,
): Promise<string> {
  if (!isEnabled()) return "";

  const system = `你是一个金融纪实作家。你的任务是把一个回合制谣言模拟游戏的结算数据，写成一段生动的叙事。

要求：
- 200-300字，中文
- 用讲故事的方式，不要罗列数据
- 描述谣言如何传播、人们如何反应、系统发生了什么变化
- 如果触发了阈值事件，要戏剧化地描述
- 语气像一个冷静的观察者在记录一场正在发生的危机
- 不要用"本回合"这种游戏术语，写得像真实事件报道`;

  const events = report.triggeredEvents.map(e => `${e.event}: ${e.detail}`).join("\n");
  const actions = submissions.map(s =>
    `${s.agent_name}选择了${s.action}(强度${s.intensity})：${s.narrative.slice(0, 80)}`
  ).join("\n");

  const user = `回合 ${roundIndex + 1}
谣言卡：${card.title} —— "${card.rumor_text}" (冲击=${card.shock}, 可信度=${card.credibility})

结算前状态：恐慌=${report.preState.Panic}, 信任=${report.preState.Trust}, 流动性=${report.preState.Liquidity}, 负载=${report.preState.Load}, 谣言=${report.preState.Rumor}, 价格=${report.preState.Price}, 损失=${report.preState.Loss}

5位参与者的选择：
${actions}

结算后状态：恐慌=${report.postState.Panic}, 信任=${report.postState.Trust}, 流动性=${report.postState.Liquidity}, 负载=${report.postState.Load}, 谣言=${report.postState.Rumor}, 价格=${report.postState.Price}, 损失=${report.postState.Loss}

触发事件：${events || "无"}

请写一段叙事，描述这一轮发生了什么。`;

  try {
    return await callClaude(system, user);
  } catch (err) {
    console.error("[aiNarrative] generateRoundNarrative failed:", err);
    return "";
  }
}

/**
 * Generate a final game narrative after the game ends or a catastrophic collapse.
 */
export async function generateGameNarrative(
  rounds: Array<{
    roundIndex: number;
    cardTitle: string;
    preState: WorldState;
    postState: WorldState;
    events: string[];
  }>,
): Promise<string> {
  if (!isEnabled()) return "";

  const system = `你是一个金融纪实作家。你的任务是为一场完整的谣言模拟实验写一篇终局总结。

要求：
- 400-600字，中文
- 用纪实文学的笔法，像在写一篇深度报道的结尾
- 回顾整个过程：从第一条谣言到最终结局
- 重点揭示"自证预言"的机制——谣言如何通过集体行为变成现实
- 点出讽刺之处：击垮系统的不是风险本身，而是对风险的反应
- 最后一段要有反思性，让读者联想到现实中的类似事件
- 不要用游戏术语，写得像真实事件的复盘报告`;

  const timeline = rounds.map(r => {
    const evts = r.events.length > 0 ? `触发：${r.events.join("、")}` : "平稳";
    return `第${r.roundIndex + 1}轮 [${r.cardTitle}]：恐慌 ${r.preState.Panic}→${r.postState.Panic}, 信任 ${r.preState.Trust}→${r.postState.Trust}, 价格 ${r.preState.Price}→${r.postState.Price}, 损失 ${r.preState.Loss}→${r.postState.Loss} | ${evts}`;
  }).join("\n");

  const lastRound = rounds[rounds.length - 1];
  const user = `这是一场6回合谣言模拟实验的完整时间线：

${timeline}

最终状态：恐慌=${lastRound.postState.Panic}, 信任=${lastRound.postState.Trust}, 流动性=${lastRound.postState.Liquidity}, 价格=${lastRound.postState.Price}, 损失=${lastRound.postState.Loss}

请写一篇终局总结。`;

  try {
    return await callClaude(system, user);
  } catch (err) {
    console.error("[aiNarrative] generateGameNarrative failed:", err);
    return "";
  }
}
