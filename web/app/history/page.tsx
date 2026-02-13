"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getGameHistory } from "@/lib/api";

interface WorldState {
  Panic: number; Trust: number; Liquidity: number;
  Load: number; Rumor: number; Price: number; Loss: number;
}

interface TriggeredEvent { event: string; detail: string; }

interface SubmissionDetail {
  playerId: string; agentName: string; action: string;
  intensity: number; signals: string[]; confidence: number; narrative: string;
}

interface RoundData {
  roundIndex: number; rumorCardId: string; state: string;
  preState: WorldState; postState: WorldState | null;
  report: {
    delta: WorldState;
    actionsSummary: Record<string, { count: number; totalIntensity: number }>;
    triggeredEvents: TriggeredEvent[];
    hashes: { preStateHash: string; postStateHash: string; actionsHash: string; roundHash: string; rumorCardHash: string };
  } | null;
  narrative: string | null; chainTxHash: string | null;
  submissions: SubmissionDetail[];
}

interface GameData {
  roomId: string; mode: string; createdAt: string;
  roundsPlayed: number; totalRounds: number; isComplete: boolean;
  endReason: string; gameNarrative: string | null; rounds: RoundData[];
}

const WORLD_LABELS: Record<string, string> = {
  Panic: "恐慌", Trust: "信任", Liquidity: "流动性",
  Load: "负载", Rumor: "谣言", Price: "价格", Loss: "损失",
};
const WORLD_KEYS: (keyof WorldState)[] = ["Panic", "Trust", "Liquidity", "Load", "Rumor", "Price", "Loss"];

const ACTION_LABELS: Record<string, string> = {
  EXIT: "撤退!", WAIT: "观望...", STABILIZE: "稳定!",
  AMPLIFY: "放大!!", ARBITRAGE: "套利!",
};
const ACTION_COLORS: Record<string, string> = {
  EXIT: "bg-[var(--comic-red)]", WAIT: "bg-zinc-600",
  STABILIZE: "bg-emerald-600", AMPLIFY: "bg-[var(--comic-purple)]",
  ARBITRAGE: "bg-[var(--comic-blue)]",
};

const EVENT_LABELS: Record<string, string> = {
  liquidity_crunch: "流动性危机", overload_trust_drop: "信任崩塌",
  rumor_viral: "谣言病毒传播", collective_confidence: "集体信心",
  calm_restored: "恐慌平息", market_stable: "市场稳定",
  self_fulfilling_loop: "自证循环", loss_spiral: "损失螺旋",
  systemic_collapse: "系统性崩溃",
};

const POSITIVE_EVENTS = new Set(["collective_confidence", "calm_restored", "market_stable"]);

const SIGNAL_LABELS: Record<string, string> = {
  panic_high: "恐慌高位", panic_rising: "恐慌上升", panic_spread: "恐慌蔓延",
  trust_low: "信任低迷", trust_repair: "信任修复",
  rumor_spread: "谣言扩散", rumor_viral: "谣言病毒传播",
  liquidity_drain: "流动性流失", liquidity_crunch: "流动性危机",
  price_dip: "价格下跌", extreme_dip: "极端下跌",
  bank_run: "银行挤兑", capital_flight: "资本外逃",
  whale_dump: "巨鲸抛售", ai_generated: "AI生成",
  counter_narrative: "反叙事", emergency_response: "紧急响应",
  info_warfare: "信息战", evidence: "证据",
  regulatory: "监管", systemic_risk: "系统性风险",
  network_congestion: "网络拥堵", overload: "过载",
  uncertainty: "不确定性", frozen: "冻结", acceptance: "接受",
  last_stand: "最后防线", token_effort: "象征性努力", symbolic: "象征性",
  final_exit: "最终撤退", final_push: "最终推动",
  risk_aversion: "风险规避", observation: "观察", preventive: "预防性",
  trend_following: "趋势跟随", no_opportunity: "无机会",
  herd_behavior: "羊群效应", consensus: "共识", indecisive: "犹豫不决",
  auto: "自动", skeptical: "怀疑",
};

function HashBlock({ label, hash }: { label: string; hash: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--muted)]">
      <span className="shrink-0 text-[var(--comic-yellow)]">{label}:</span>
      <span className="truncate flex-1">{hash}</span>
      <button
        onClick={copy}
        className="shrink-0 px-2 py-0.5 bg-black border border-[var(--muted)]/30 hover:border-[var(--comic-yellow)] text-[var(--muted)] hover:text-[var(--comic-yellow)] transition-colors cursor-pointer font-bold"
      >
        {copied ? "已复制!" : "复制"}
      </button>
    </div>
  );
}

function RoundCard({ round, defaultOpen }: { round: RoundData; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [hashOpen, setHashOpen] = useState(false);
  const report = round.report;

  return (
    <div className="comic-panel overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 sm:p-4 text-left cursor-pointer hover:bg-black/20 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-black text-sm uppercase">回合 {round.roundIndex + 1}</span>
          <span className="comic-badge bg-[var(--comic-yellow)] text-black text-[10px]">{round.rumorCardId}</span>
          {report?.triggeredEvents?.map((ev, i) => (
            <span key={i} className={`comic-badge text-white text-[10px] ${POSITIVE_EVENTS.has(ev.event) ? "bg-emerald-600" : "bg-[var(--comic-red)]"}`}>
              {EVENT_LABELS[ev.event] || ev.event}
            </span>
          ))}
        </div>
        <span className="text-[var(--muted)] text-xs font-bold uppercase">{open ? "收起" : "展开"}</span>
      </button>

      {open && report && (
        <div className="border-t-2 border-black p-3 sm:p-4 space-y-4">
          {/* Delta */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono font-bold">
            {WORLD_KEYS.map((k) => {
              const d = report.delta[k];
              if (d === 0) return null;
              const color = d > 0 ? "text-[var(--comic-red)]" : "text-emerald-400";
              return (
                <span key={k} className={color}>
                  {WORLD_LABELS[k]} {d > 0 ? "▲+" : "▼"}{d}
                </span>
              );
            })}
          </div>

          {/* Actions summary */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(report.actionsSummary).map(([action, info]) => (
              <span
                key={action}
                className={`comic-badge ${ACTION_COLORS[action] || "bg-zinc-600"} text-white text-xs`}
              >
                {ACTION_LABELS[action] || action} x{info.count} (强度 {info.totalIntensity})
              </span>
            ))}
          </div>

          {/* Triggered events */}
          {report.triggeredEvents.length > 0 && (
            <div className="space-y-1">
              {report.triggeredEvents.map((ev, i) => (
                <div key={i} className="text-xs flex items-start gap-2">
                  <span className={`comic-badge text-white text-[10px] shrink-0 ${POSITIVE_EVENTS.has(ev.event) ? "bg-emerald-600" : "bg-[var(--comic-red)]"}`}>
                    {EVENT_LABELS[ev.event] || ev.event}
                  </span>
                  <span className="text-[var(--muted)]">{ev.detail}</span>
                </div>
              ))}
            </div>
          )}

          {/* Submissions */}
          {round.submissions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">玩家报告</h4>
              {round.submissions.map((sub, i) => (
                <div key={i} className="border-t-2 border-black pt-2 first:border-0 first:pt-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`comic-badge ${ACTION_COLORS[sub.action] || "bg-zinc-600"} text-white text-[10px]`}>
                      {ACTION_LABELS[sub.action] || sub.action}
                    </span>
                    <span className="text-xs font-black uppercase">{sub.agentName}</span>
                    <span className="text-[10px] text-[var(--muted)] font-mono">强度={sub.intensity} 置信={sub.confidence}</span>
                  </div>
                  <div className="speech-bubble text-xs leading-relaxed">{sub.narrative}</div>
                </div>
              ))}
            </div>
          )}

          {/* Narrative */}
          {round.narrative && (
            <div className="border-t-2 border-[var(--comic-yellow)]/30 pt-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-[var(--comic-yellow)] mb-1">局势纪实</h4>
              <p className="text-xs text-[var(--fg)] leading-relaxed whitespace-pre-line italic">
                {round.narrative}
              </p>
            </div>
          )}

          {/* Hashes */}
          <div>
            <button
              onClick={() => setHashOpen(!hashOpen)}
              className="text-[10px] text-[var(--muted)] hover:text-[var(--comic-yellow)] transition-colors cursor-pointer flex items-center gap-1 font-bold uppercase tracking-wider"
            >
              <span className={`inline-block transition-transform ${hashOpen ? "rotate-90" : ""}`}>▶</span>
              哈希验证
            </button>
            {hashOpen && (
              <div className="mt-2 space-y-1 bg-black/30 border-2 border-black p-3">
                <HashBlock label="roundHash" hash={report.hashes.roundHash} />
                <HashBlock label="preStateHash" hash={report.hashes.preStateHash} />
                <HashBlock label="postStateHash" hash={report.hashes.postStateHash} />
                <HashBlock label="actionsHash" hash={report.hashes.actionsHash} />
                <HashBlock label="rumorCardHash" hash={report.hashes.rumorCardHash} />
                {round.chainTxHash && <HashBlock label="chainTxHash" hash={round.chainTxHash} />}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GameCard({ game }: { game: GameData }) {
  const [open, setOpen] = useState(false);
  const date = new Date(game.createdAt).toLocaleString("zh-CN");
  const isCollapse = game.endReason === "系统性崩溃";

  return (
    <div className="comic-panel overflow-hidden card-hover">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left cursor-pointer hover:bg-black/20 transition-colors"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-sm uppercase">{date}</span>
            <span className={`comic-badge text-[10px] ${
              isCollapse
                ? "bg-[var(--comic-red)] text-white"
                : game.isComplete
                  ? "bg-emerald-600 text-white"
                  : "bg-[var(--comic-yellow)] text-black"
            }`}>
              {game.endReason}
            </span>
          </div>
          <div className="text-xs text-[var(--muted)] font-mono">
            {game.roundsPlayed} 回合已结算 · {game.roomId.slice(0, 8)}...
          </div>
        </div>
        <span className="text-[var(--muted)] text-xs font-bold uppercase">{open ? "收起" : "展开"}</span>
      </button>

      {open && (
        <div className="border-t-2 border-black p-4 sm:p-5 space-y-4">
          {game.gameNarrative && (
            <div className="comic-panel-accent p-4 space-y-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-[var(--comic-yellow)]">终局纪实</h3>
              <p className="text-sm text-[var(--fg)] leading-relaxed whitespace-pre-line">
                {game.gameNarrative}
              </p>
            </div>
          )}
          <div className="space-y-3">
            {game.rounds.filter(r => r.state === "RESOLVED").map((round) => (
              <RoundCard key={round.roundIndex} round={round} defaultOpen={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const [games, setGames] = useState<GameData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getGameHistory()
      .then((data) => setGames(data.games || []))
      .catch(() => setError("无法加载历史记录"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 stagger">
        <div className="skeleton h-8 w-48" />
        {[0, 1, 2].map(i => (
          <div key={i} className="comic-panel p-5 space-y-3">
            <div className="skeleton h-4 w-48" />
            <div className="skeleton h-3 w-32" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 stagger">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider">历史记录</h1>
        <Link
          href="/"
          className="comic-btn bg-[var(--comic-yellow)] text-black px-4 py-2 text-sm"
        >
          返回游戏
        </Link>
      </div>

      {error && (
        <div className="comic-panel-danger p-4 text-sm flex items-center gap-2">
          <span className="sfx sfx-red text-base">ERR!</span>
          <span className="font-bold text-[var(--comic-red)]">{error}</span>
        </div>
      )}

      {games.length === 0 ? (
        <div className="text-center py-10 text-[var(--muted)]">
          <span className="sfx sfx-yellow text-2xl block mb-3">EMPTY!</span>
          <p className="font-bold uppercase tracking-wider">还没有历史记录</p>
        </div>
      ) : (
        <div className="space-y-4">
          {games.map((game) => (
            <GameCard key={game.roomId} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
