"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getDefaultRoom, getRounds, getRoundDetail, getChainVerification, startNewGame } from "@/lib/api";

interface WorldState {
  Panic: number; Trust: number; Liquidity: number;
  Load: number; Rumor: number; Price: number; Loss: number;
}

interface RumorCard {
  id: string; title: string; rumor_text: string;
  shock: number; credibility: number; focus: string[];
}

interface TriggeredEvent { event: string; detail: string; }

interface SubmissionDetail {
  playerId: string; agentName: string; action: string;
  intensity: number; signals: string[]; confidence: number; narrative: string;
  nfaTokenId?: string | null;
  walletAddress?: string | null;
}

interface RoundReport {
  roundIndex: number; rumorCardId: string;
  preState: WorldState; postState: WorldState; delta: WorldState;
  actionsSummary: Record<string, { count: number; totalIntensity: number }>;
  triggeredEvents: TriggeredEvent[];
  narrativeHighlights: string[];
  hashes: { roundHash: string };
}

interface RoomData {
  roomId: string; mode: string; roundId: string;
  roundIndex: number; roundState: string; submissionsCount: number;
  roundPack: { round: number; mode: string; rumor_card: RumorCard; world: WorldState };
  report: RoundReport | null; gameOver?: boolean;
  message?: string;
}

const WORLD_KEYS: (keyof WorldState)[] = ["Panic", "Trust", "Liquidity", "Load", "Rumor", "Price", "Loss"];

const WORLD_LABELS: Record<string, string> = {
  Panic: "恐慌", Trust: "信任", Liquidity: "流动性",
  Load: "负载", Rumor: "谣言", Price: "价格", Loss: "损失",
};

const BAR_COLORS: Record<string, string> = {
  Panic: "bg-red-500", Trust: "bg-emerald-500", Liquidity: "bg-blue-500",
  Load: "bg-orange-500", Rumor: "bg-purple-500", Price: "bg-amber-400", Loss: "bg-rose-400",
};

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

/* ========== Skeleton ========== */

function SkeletonBar() {
  return (
    <div className="flex items-center gap-2">
      <div className="skeleton w-20 h-3" />
      <div className="skeleton flex-1 h-5" />
      <div className="skeleton w-8 h-3" />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 stagger">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="skeleton h-8 w-64 sm:w-80" />
          <div className="skeleton h-3 w-32" />
        </div>
        <div className="skeleton h-12 w-28" />
      </div>
      <div className="comic-panel p-5 space-y-3">
        <div className="skeleton h-5 w-48" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-3/4" />
      </div>
      <div className="flex gap-2">
        {[0,1,2,3,4].map(i => <div key={i} className="skeleton w-10 h-10 rounded-full" />)}
      </div>
      <div className="comic-panel p-4 space-y-2">
        <div className="skeleton h-4 w-28 mb-3" />
        {WORLD_KEYS.map(k => <SkeletonBar key={k} />)}
      </div>
    </div>
  );
}

/* ========== Components ========== */

function StateBar({ label, value }: { label: string; value: number }) {
  const v = Math.round(Math.max(0, Math.min(100, value)));
  const isDanger = (label === "Trust" || label === "Liquidity" || label === "Price") ? v < 40 : v > 60;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 sm:w-20 text-right text-[var(--muted)] truncate font-bold tracking-wide">
        {WORLD_LABELS[label] || label}
      </span>
      <div className="bar-track flex-1">
        <div
          className={`bar-fill ${BAR_COLORS[label] || "bg-zinc-500"}`}
          style={{ width: `${v}%` }}
        />
      </div>
      <span className={`w-10 text-right font-mono font-black text-sm ${isDanger ? "text-[var(--comic-red)] comic-shake" : ""}`}>
        {v}
      </span>
    </div>
  );
}

function WorldPanel({ title, state }: { title: string; state: WorldState }) {
  return (
    <div className="comic-panel p-3 sm:p-4 space-y-1.5 card-hover">
      <h3 className="text-sm font-black uppercase tracking-wider mb-2 text-[var(--comic-yellow)]">
        {title}
      </h3>
      {WORLD_KEYS.map((k) => <StateBar key={k} label={k} value={state[k]} />)}
    </div>
  );
}

function DeltaPanel({ delta }: { delta: WorldState }) {
  return (
    <div className="comic-panel p-3 sm:p-4 card-hover">
      <h3 className="text-sm font-black uppercase tracking-wider mb-2 text-[var(--comic-yellow)]">
        变化量
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono font-bold">
        {WORLD_KEYS.map((k) => {
          const v = delta[k];
          const color = v > 0 ? "text-[var(--comic-red)]" : v < 0 ? "text-emerald-400" : "text-[var(--muted)]";
          const sign = v > 0 ? "+" : "";
          const arrow = v > 0 ? "▲" : v < 0 ? "▼" : "─";
          return (
            <div key={k} className={`flex justify-between ${color}`}>
              <span>{WORLD_LABELS[k] || k}</span>
              <span>{arrow} {sign}{v}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SubmissionsList({ subs }: { subs: SubmissionDetail[] }) {
  if (!subs.length) return null;
  return (
    <div className="space-y-4">
      {subs.map((sub, i) => (
        <div key={i} className="border-t-2 border-black pt-3 first:border-0 first:pt-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`comic-badge ${ACTION_COLORS[sub.action] || "bg-zinc-600"} text-white text-[11px]`}>
              {ACTION_LABELS[sub.action] || sub.action}
            </span>
            <span className="text-sm font-black uppercase tracking-wide">{sub.agentName}</span>
            {sub.nfaTokenId && (
              <span className="comic-badge bg-[var(--comic-blue)] text-white text-[10px]">
                NFA #{sub.nfaTokenId}
              </span>
            )}
            <span className="text-[10px] text-[var(--muted)] font-mono">
              强度={sub.intensity} 置信={sub.confidence}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {sub.signals.map((s, j) => (
              <span key={j} className="bg-black/40 text-[var(--comic-yellow)] text-[10px] px-2 py-0.5 border border-[var(--comic-yellow)]/30 font-mono">
                {SIGNAL_LABELS[s] || s}
              </span>
            ))}
          </div>
          {sub.walletAddress && (
            <div className="text-[10px] text-[var(--muted)] font-mono truncate max-w-[200px]" title={sub.walletAddress}>
              {sub.walletAddress.slice(0, 6)}...{sub.walletAddress.slice(-4)}
            </div>
          )}
          {/* Speech bubble for narrative */}
          <div className="speech-bubble text-sm leading-relaxed">
            {sub.narrative}
          </div>
        </div>
      ))}
    </div>
  );
}

function HashPanel({ hashes, chainTxHash }: { hashes: { roundHash: string }; chainTxHash?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const items = [
    { label: "roundHash", value: hashes.roundHash },
    ...(chainTxHash ? [{ label: "chainTxHash", value: chainTxHash }] : []),
  ];

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="text-[10px] text-[var(--muted)] hover:text-[var(--comic-yellow)] transition-colors cursor-pointer flex items-center gap-1 font-bold uppercase tracking-wider"
      >
        <span className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
        哈希验证
      </button>
      {open && (
        <div className="mt-2 space-y-1 bg-black/30 border-2 border-black p-3">
          {items.map(({ label, value }) => (
            <div key={label} className="flex items-center gap-2 text-[10px] font-mono text-[var(--muted)]">
              <span className="shrink-0 text-[var(--comic-yellow)]">{label}:</span>
              <span className="truncate flex-1">{value}</span>
              <button
                onClick={() => copy(label, value)}
                className="shrink-0 px-2 py-0.5 bg-black border border-[var(--muted)]/30 hover:border-[var(--comic-yellow)] text-[var(--muted)] hover:text-[var(--comic-yellow)] transition-colors cursor-pointer font-bold"
              >
                {copied === label ? "已复制!" : "复制"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="error-toast comic-panel-danger p-4 text-sm text-[var(--comic-red)] flex items-center gap-3">
      <span className="sfx sfx-red text-lg">ERR!</span>
      <span className="font-bold">{message}</span>
    </div>
  );
}

/* ========== MAIN PAGE ========== */

export default function Home() {
  const [data, setData] = useState<RoomData | null>(null);
  const [subsMap, setSubsMap] = useState<Record<number, SubmissionDetail[]>>({});
  const [narrativeMap, setNarrativeMap] = useState<Record<number, string>>({});
  const [gameNarrative, setGameNarrative] = useState<string>("");
  const [history, setHistory] = useState<RoundReport[]>([]);
  const [chainInfo, setChainInfo] = useState<{ enabled: boolean; verified?: boolean; chainTxHash?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const room = await getDefaultRoom();
      setData(room);
      setError("");

      if (room.roomId) {
        const roundsRes = await getRounds(room.roomId);
        const resolvedRounds: RoundReport[] = [];
        const narMap: Record<number, string> = {};
        let gNarrative = "";
        if (roundsRes.rounds) {
          for (const r of roundsRes.rounds) {
            if (r.report) resolvedRounds.push(r.report);
            if (r.narrative) narMap[r.roundIndex] = r.narrative;
            if (r.gameNarrative) gNarrative = r.gameNarrative;
          }
          setHistory(resolvedRounds);
          setNarrativeMap(narMap);
          setGameNarrative(gNarrative);
        }

        if (resolvedRounds.length > 0) {
          const detailPromises = resolvedRounds.map((r) =>
            getRoundDetail(room.roomId, r.roundIndex).catch(() => null)
          );
          const details = await Promise.all(detailPromises);
          const newMap: Record<number, SubmissionDetail[]> = {};
          details.forEach((d, i) => {
            if (d?.submissions) newMap[resolvedRounds[i].roundIndex] = d.submissions;
          });
          // Also fetch current waiting round submissions
          if (room.roundState === "WAITING_SUBMISSIONS" && room.submissionsCount > 0) {
            const cur = await getRoundDetail(room.roomId, room.roundIndex).catch(() => null);
            if (cur?.submissions) newMap[room.roundIndex] = cur.submissions;
          }
          setSubsMap(newMap);
        } else if (room.roundState === "WAITING_SUBMISSIONS" && room.submissionsCount > 0) {
          // No resolved rounds yet, but current round has submissions
          const cur = await getRoundDetail(room.roomId, room.roundIndex).catch(() => null);
          if (cur?.submissions) {
            setSubsMap({ [room.roundIndex]: cur.submissions });
          } else {
            setSubsMap({});
          }
        } else {
          setSubsMap({});
        }

        if (room.roundState === "RESOLVED" && room.report) {
          const chain = await getChainVerification(room.roomId, room.roundIndex).catch(() => null);
          if (chain) setChainInfo(chain);
        } else {
          setChainInfo(null);
        }
      }
    } catch (e) {
      setError("无法连接服务器，请确认后端已启动");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [refresh]);

  if (loading) return <LoadingSkeleton />;
  if (error && !data) return <ErrorBanner message={error} />;

  /* ===== GAME OVER ===== */
  if (!data || data.gameOver) {
    const isCollapse = data?.message === "系统性崩溃";
    const handleNewGame = async () => {
      await startNewGame();
      setLoading(true);
      refresh();
    };
    return (
      <div className="py-8 space-y-6 fade-up">
        <div className="text-center space-y-4">
          <div className="slam-in inline-block">
            <span className={`sfx text-4xl sm:text-5xl ${isCollapse ? "sfx-red" : "sfx-yellow"}`}>
              {isCollapse ? "CRASH!!" : "THE END"}
            </span>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-wider">
            {isCollapse ? "系统性崩溃" : "游戏结束"}
          </h1>
          <p className="text-[var(--muted)] max-w-md mx-auto">
            {isCollapse
              ? "谣言引发的恐慌摧毁了整个系统。自证预言已经完成。"
              : "所有回合已完成。谣言的自证预言已经揭晓。"}
          </p>
        </div>

        {gameNarrative && (
          <div className="comic-panel-accent p-5 sm:p-6 space-y-3 card-hover">
            <h3 className="text-sm font-black uppercase tracking-wider text-[var(--comic-yellow)]">
              终局纪实
            </h3>
            <p className="text-sm text-[var(--fg)] leading-relaxed whitespace-pre-line">
              {gameNarrative}
            </p>
          </div>
        )}

        <div className="text-center space-y-4">
          <button
            onClick={handleNewGame}
            className="comic-btn bg-[var(--comic-yellow)] text-black px-8 py-3 text-lg"
          >
            开始新游戏!
          </button>
          <div className="flex items-center justify-center gap-4">
            <Link href="/agents" className="text-sm text-[var(--muted)] hover:text-[var(--comic-yellow)] transition-colors font-bold uppercase tracking-wider">
              排行榜 →
            </Link>
            <Link href="/history" className="text-sm text-[var(--muted)] hover:text-[var(--comic-yellow)] transition-colors font-bold uppercase tracking-wider">
              历史记录 →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const card = data.roundPack?.rumor_card;
  const world = data.roundPack?.world;
  const isResolved = data.roundState === "RESOLVED";
  const report = data.report;

  return (
    <div className="space-y-5 sm:space-y-6 stagger">
      {error && <ErrorBanner message={error} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider leading-tight">
            如果谣言是真的…
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1 font-mono">
            回合 {data.roundIndex + 1} / 6
            <span className="ml-2 text-[10px] text-[var(--comic-yellow)]">故事模式</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/agents"
            className="text-sm text-[var(--muted)] hover:text-[var(--comic-yellow)] transition-colors font-bold uppercase tracking-wider"
          >
            排行榜
          </Link>
          <Link
            href="/history"
            className="text-sm text-[var(--muted)] hover:text-[var(--comic-yellow)] transition-colors font-bold uppercase tracking-wider"
          >
            历史记录
          </Link>
          {!isResolved && (
            <Link
              href="/play"
              className="comic-btn bg-[var(--comic-yellow)] text-black px-5 py-2.5 text-sm min-h-[44px] flex items-center justify-center"
            >
              参与游戏!
            </Link>
          )}
        </div>
      </div>

      {/* Rumor Card — comic panel with action lines */}
      {card && (
        <div className="comic-panel-accent action-lines p-4 sm:p-5 space-y-3 card-hover">
          <div className="relative z-10 space-y-3">
            <div className="flex items-start sm:items-center gap-2 flex-wrap">
              <span className="comic-badge bg-[var(--comic-red)] text-white text-xs">{card.id}</span>
              <span className="font-black text-base sm:text-lg uppercase tracking-wide">{card.title}</span>
            </div>
            {/* Rumor text as speech bubble */}
            <div className="speech-bubble text-sm italic leading-relaxed">
              &ldquo;{card.rumor_text}&rdquo;
            </div>
            <div className="flex flex-wrap gap-3 text-xs font-mono font-bold mt-2">
              <span className="text-[var(--comic-red)]">冲击={card.shock}</span>
              <span className="text-[var(--comic-blue)]">可信度={card.credibility}</span>
              <span className="text-[var(--comic-yellow)]">影响=[{card.focus.join(", ")}]</span>
            </div>
          </div>
        </div>
      )}

      {/* Submissions count — comic dots */}
      <div className="flex items-center gap-3">
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map((i) => {
            const filled = i < data.submissionsCount;
            const isNext = i === data.submissionsCount && !isResolved;
            return (
              <div
                key={i}
                className={`comic-dot w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-sm transition-colors ${
                  filled
                    ? "bg-[var(--comic-yellow)] text-black"
                    : "bg-[var(--comic-dark)] text-zinc-600"
                } ${isNext ? "dot-pulse" : ""}`}
              >
                {i + 1}
              </div>
            );
          })}
        </div>
        <span className="text-sm text-[var(--muted)] font-bold uppercase tracking-wider">
          {isResolved ? (
            <span className="text-[var(--comic-yellow)]">已结算!</span>
          ) : (
            `${data.submissionsCount}/5 已提交`
          )}
        </span>
      </div>

      {/* World State (before resolve) */}
      {world && !isResolved && <WorldPanel title="当前世界状态" state={world} />}

      {/* Waiting-phase submissions */}
      {!isResolved && (subsMap[data.roundIndex]?.length ?? 0) > 0 && (
        <div className="comic-panel p-3 sm:p-4 space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-[var(--comic-yellow)]">
            已提交的 Agent
          </h3>
          <SubmissionsList subs={subsMap[data.roundIndex]} />
        </div>
      )}

      {/* Report (after resolve) */}
      {isResolved && report && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <WorldPanel title="结算前" state={report.preState} />
            <WorldPanel title="结算后" state={report.postState} />
          </div>

          <DeltaPanel delta={report.delta} />

          {/* Actions Summary */}
          <div className="comic-panel p-3 sm:p-4 card-hover">
            <h3 className="text-sm font-black uppercase tracking-wider mb-3 text-[var(--comic-yellow)]">
              动作统计
            </h3>
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
          </div>

          {/* Triggered Events */}
          {report.triggeredEvents.length > 0 && (
            <div className="comic-panel-danger p-3 sm:p-4">
              <h3 className="text-sm font-black uppercase tracking-wider mb-2 text-[var(--comic-red)]">
                <span className="sfx sfx-red text-base mr-2">BOOM!</span>
                触发事件
              </h3>
              <div className="space-y-2">
                {report.triggeredEvents.map((ev, i) => {
                  const isPositive = POSITIVE_EVENTS.has(ev.event);
                  return (
                    <div key={i} className="text-xs flex items-start gap-2">
                      <span className={`comic-badge text-white text-[10px] shrink-0 ${isPositive ? "bg-emerald-600" : "bg-[var(--comic-red)]"}`}>
                        {EVENT_LABELS[ev.event] || ev.event}
                      </span>
                      <span className="text-[var(--muted)]">{ev.detail}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Submissions with Narratives */}
          {(subsMap[data.roundIndex]?.length ?? 0) > 0 && (
            <div className="comic-panel p-3 sm:p-4 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-[var(--comic-yellow)]">
                玩家报告
              </h3>
              <SubmissionsList subs={subsMap[data.roundIndex]} />
            </div>
          )}

          {/* AI Round Narrative */}
          {narrativeMap[data.roundIndex] && (
            <div className="comic-panel-accent p-4 sm:p-5 space-y-2 card-hover">
              <h3 className="text-sm font-black uppercase tracking-wider text-[var(--comic-yellow)]">
                局势纪实
              </h3>
              <p className="text-sm text-[var(--fg)] leading-relaxed whitespace-pre-line italic">
                {narrativeMap[data.roundIndex]}
              </p>
            </div>
          )}

          {/* Hash */}
          <HashPanel hashes={report.hashes} chainTxHash={chainInfo?.chainTxHash} />

          {/* Chain Verification */}
          {chainInfo && (
            <div className={`comic-panel p-3 text-xs space-y-1 ${
              chainInfo.verified ? "!border-emerald-500" : chainInfo.enabled ? "!border-[var(--comic-yellow)]" : ""
            }`}>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full shrink-0 border-2 border-black ${
                  chainInfo.verified ? "bg-emerald-400" : chainInfo.enabled ? "bg-[var(--comic-yellow)]" : "bg-zinc-500"
                }`} />
                <span className="font-black uppercase tracking-wider">
                  {chainInfo.verified
                    ? "链上已验证!"
                    : chainInfo.enabled
                      ? "链上验证中..."
                      : "链上未配置"}
                </span>
              </div>
              {chainInfo.chainTxHash && (
                <div className="font-mono text-[var(--muted)] break-all text-[10px]">
                  txHash: {chainInfo.chainTxHash}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.filter((r) => r.roundIndex !== data.roundIndex).length > 0 && (
        <div className="border-t-4 border-black pt-5 space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-[var(--muted)]">
            历史回合
          </h3>
          {history
            .filter((r) => r.roundIndex !== data.roundIndex)
            .map((r) => (
              <div
                key={r.roundIndex}
                className="comic-panel p-3 sm:p-4 text-xs space-y-3 card-hover"
              >
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="font-black text-sm uppercase">
                    回合 {r.roundIndex + 1} — <span className="text-[var(--comic-yellow)]">[{r.rumorCardId}]</span>
                  </span>
                  <div className="flex gap-1 flex-wrap">
                    {r.triggeredEvents.map((ev, i) => (
                      <span key={i} className={`comic-badge text-white text-[10px] ${POSITIVE_EVENTS.has(ev.event) ? "bg-emerald-600" : "bg-[var(--comic-red)]"}`}>
                        {EVENT_LABELS[ev.event] || ev.event}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Delta */}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono font-bold">
                  {WORLD_KEYS.map((k) => {
                    const d = r.delta[k];
                    if (d === 0) return null;
                    const color = d > 0 ? "text-[var(--comic-red)]" : "text-emerald-400";
                    return (
                      <span key={k} className={color}>
                        {WORLD_LABELS[k] || k} {d > 0 ? "+" : ""}{d}
                      </span>
                    );
                  })}
                </div>
                {/* Agent submissions */}
                {subsMap[r.roundIndex]?.length > 0 && (
                  <div className="border-t-2 border-black pt-3">
                    <SubmissionsList subs={subsMap[r.roundIndex]} />
                  </div>
                )}
                {/* AI narrative */}
                {narrativeMap[r.roundIndex] && (
                  <div className="border-t-2 border-[var(--comic-yellow)]/30 pt-3">
                    <p className="text-xs text-[var(--fg)] leading-relaxed whitespace-pre-line italic">
                      {narrativeMap[r.roundIndex]}
                    </p>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
