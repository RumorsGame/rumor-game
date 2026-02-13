import { z } from "zod";

const VALID_ACTIONS = ["EXIT", "WAIT", "STABILIZE", "AMPLIFY", "ARBITRAGE"] as const;

const VALID_SIGNALS = [
  "panic_high", "panic_rising", "panic_spread",
  "trust_low", "trust_repair",
  "rumor_spread", "rumor_viral",
  "liquidity_drain", "liquidity_crunch",
  "price_dip", "extreme_dip",
  "bank_run", "capital_flight",
  "whale_dump", "ai_generated",
  "counter_narrative", "emergency_response",
  "info_warfare", "evidence",
  "regulatory", "systemic_risk",
  "network_congestion", "overload",
  "uncertainty", "frozen", "acceptance",
  "last_stand", "token_effort", "symbolic",
  "final_exit", "final_push",
] as const;

// Regex: must contain at least 2 variable references like Panic=xx, Trust=xx, Price=xx, etc.
const VAR_REF_PATTERN = /(Panic|Trust|Liquidity|Load|Rumor|Price|Loss)\s*[=＝]\s*\d+/g;

export const submissionSchema = z.object({
  agent_name: z.string().min(1).max(50),
  action: z.enum(VALID_ACTIONS),
  intensity: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  signals: z.array(z.string().min(1)).min(1).max(10),
  confidence: z.number().min(0).max(1),
  narrative: z.string().min(100).max(500),
});

export function validateNarrativeRefs(narrative: string): string[] {
  const errors: string[] = [];
  const matches = narrative.match(VAR_REF_PATTERN);
  if (!matches || matches.length < 2) {
    errors.push("narrative 必须引用至少2个世界变量数值（如 Panic=82 Trust=38）");
  }
  return errors;
}

export const createRoomSchema = z.object({
  mode: z.enum(["story", "chaos"]),
});

export const submitSchema = z.object({
  playerId: z.string().min(1).max(100),
  submission: submissionSchema,
});
