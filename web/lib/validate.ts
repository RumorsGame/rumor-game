const VALID_ACTIONS = ["EXIT", "WAIT", "STABILIZE", "AMPLIFY", "ARBITRAGE"];

const VAR_REF_PATTERN =
  /(Panic|Trust|Liquidity|Load|Rumor|Price|Loss)\s*[=＝]\s*\d+/g;

export function validateSubmission(raw: string): {
  ok: boolean;
  data?: Record<string, unknown>;
  errors: string[];
} {
  const errors: string[] = [];

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, errors: ["JSON 解析失败，请检查格式"] };
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { ok: false, errors: ["必须是 JSON 对象"] };
  }

  if (!data.agent_name || typeof data.agent_name !== "string") {
    errors.push("缺少 agent_name 或类型错误");
  }

  if (!VALID_ACTIONS.includes(data.action as string)) {
    errors.push(`action 必须是 ${VALID_ACTIONS.join(" | ")} 之一`);
  }

  if (![1, 2, 3].includes(data.intensity as number)) {
    errors.push("intensity 必须是 1, 2, 或 3");
  }

  if (!Array.isArray(data.signals) || data.signals.length < 1) {
    errors.push("signals 必须是非空数组");
  }

  const conf = data.confidence as number;
  if (typeof conf !== "number" || conf < 0 || conf > 1) {
    errors.push("confidence 必须是 0~1 的数字");
  }

  if (typeof data.narrative !== "string" || (data.narrative as string).length < 100) {
    errors.push("narrative 必须 100-200 字（至少 100 字）");
  }

  if (typeof data.narrative === "string") {
    const matches = (data.narrative as string).match(VAR_REF_PATTERN);
    if (!matches || matches.length < 2) {
      errors.push("narrative 必须引用至少 2 个世界变量数值（如 Panic=82 Trust=38）");
    }
  }

  return { ok: errors.length === 0, data, errors };
}
