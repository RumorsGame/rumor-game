// ===== World State =====
export interface WorldState {
  Panic: number;
  Trust: number;
  Liquidity: number;
  Load: number;
  Rumor: number;
  Price: number;
  Loss: number;
}

export const WORLD_KEYS: (keyof WorldState)[] = [
  "Panic", "Trust", "Liquidity", "Load", "Rumor", "Price", "Loss",
];

export const DEFAULT_WORLD: WorldState = {
  Panic: 25,
  Trust: 78,
  Liquidity: 85,
  Load: 30,
  Rumor: 15,
  Price: 88,
  Loss: 2,
};

// ===== Rumor Card =====
export interface RumorCard {
  id: string;
  title: string;
  rumor_text: string;
  shock: number;
  credibility: number;
  focus: string[];
}

// ===== Action Enum =====
export type Action = "EXIT" | "WAIT" | "STABILIZE" | "AMPLIFY" | "ARBITRAGE";
export const ACTIONS: Action[] = ["EXIT", "WAIT", "STABILIZE", "AMPLIFY", "ARBITRAGE"];

// ===== Submission =====
export interface Submission {
  agent_name: string;
  action: Action;
  intensity: 1 | 2 | 3;
  signals: string[];
  confidence: number;
  narrative: string;
}

// ===== Resolve Environment (cross-round state) =====
export interface ResolveEnv {
  nextShockBonus: number;
}

// ===== Triggered Event =====
export interface TriggeredEvent {
  event: string;
  detail: string;
}

// ===== Actions Summary =====
export interface ActionsSummary {
  [action: string]: { count: number; totalIntensity: number };
}

// ===== Round Report =====
export interface RoundReport {
  roundIndex: number;
  rumorCardId: string;
  preState: WorldState;
  postState: WorldState;
  delta: WorldState;
  actionsSummary: ActionsSummary;
  triggeredEvents: TriggeredEvent[];
  narrativeHighlights: string[];
  hashes: RoundHashes;
}

// ===== Hashes =====
export interface RoundHashes {
  preStateHash: string;
  postStateHash: string;
  actionsHash: string;
  roundHash: string;
  rumorCardHash: string;
}

// ===== Resolve Result =====
export interface ResolveResult {
  postState: WorldState;
  report: RoundReport;
  envOut: ResolveEnv;
}
