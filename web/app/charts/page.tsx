"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getGameHistory } from "@/lib/api";

interface WorldState {
  Panic: number; Trust: number; Liquidity: number;
  Load: number; Rumor: number; Price: number; Loss: number;
}

interface TriggeredEvent { event: string; detail: string; }

interface RoundData {
  roundIndex: number; rumorCardId: string; state: string;
  preState: WorldState; postState: WorldState | null;
  report: { delta: WorldState; triggeredEvents: TriggeredEvent[] } | null;
  narrative: string | null;
}

interface GameData {
  roomId: string; mode: string; createdAt: string;
  roundsPlayed: number; isComplete: boolean; endReason: string;
  rounds: RoundData[];
}

const WORLD_KEYS: (keyof WorldState)[] = ["Panic", "Trust", "Liquidity", "Load", "Rumor", "Price", "Loss"];

const WORLD_LABELS: Record<string, string> = {
  Panic: "恐慌", Trust: "信任", Liquidity: "流动性",
  Load: "负载", Rumor: "谣言", Price: "价格", Loss: "损失",
};

const LINE_COLORS: Record<string, string> = {
  Panic: "#ef4444", Trust: "#22c55e", Liquidity: "#3b82f6",
  Load: "#f59e0b", Rumor: "#a855f7", Price: "#06b6d4", Loss: "#f43f5e",
};

const EVENT_LABELS: Record<string, string> = {
  liquidity_crunch: "流动性危机", overload_trust_drop: "信任崩塌",
  rumor_viral: "谣言病毒传播", collective_confidence: "集体信心",
  calm_restored: "恐慌平息", market_stable: "市场稳定",
  self_fulfilling_loop: "自证循环", loss_spiral: "损失螺旋",
  systemic_collapse: "系统性崩溃",
};

const POSITIVE_EVENTS = new Set(["collective_confidence", "calm_restored", "market_stable"]);

// SVG line chart dimensions
const W = 720, H = 320, PAD_L = 45, PAD_R = 15, PAD_T = 20, PAD_B = 35;
const CHART_W = W - PAD_L - PAD_R;
const CHART_H = H - PAD_T - PAD_B;

function toX(i: number, total: number) {
  return PAD_L + (total <= 1 ? CHART_W / 2 : (i / (total - 1)) * CHART_W);
}
function toY(v: number) {
  return PAD_T + CHART_H - (v / 100) * CHART_H;
}

function LineChart({ game, visibleKeys }: { game: GameData; visibleKeys: Set<string> }) {
  const resolved = game.rounds.filter(r => r.state === "RESOLVED" && r.postState);
  if (resolved.length === 0) return <div className="text-[var(--muted)] text-sm">暂无已结算回合</div>;

  // Build data points: round 0 preState + each round's postState
  const points: WorldState[] = [resolved[0].preState];
  for (const r of resolved) {
    if (r.postState) points.push(r.postState);
  }
  const total = points.length;

  // Collect events per round
  const eventsByRound: { roundIndex: number; events: TriggeredEvent[] }[] = [];
  for (const r of resolved) {
    if (r.report?.triggeredEvents?.length) {
      eventsByRound.push({ roundIndex: r.roundIndex, events: r.report.triggeredEvents });
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ maxHeight: 360 }}>
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map(v => (
        <g key={v}>
          <line x1={PAD_L} y1={toY(v)} x2={W - PAD_R} y2={toY(v)}
            stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
          <text x={PAD_L - 6} y={toY(v) + 4} textAnchor="end"
            fill="rgba(255,255,255,0.3)" fontSize={10} fontFamily="monospace">{v}</text>
        </g>
      ))}

      {/* X axis labels */}
      {points.map((_, i) => (
        <text key={i} x={toX(i, total)} y={H - 8} textAnchor="middle"
          fill="rgba(255,255,255,0.4)" fontSize={10} fontFamily="monospace">
          {i === 0 ? "初始" : `R${i}`}
        </text>
      ))}

      {/* Data lines */}
      {WORLD_KEYS.filter(k => visibleKeys.has(k)).map(key => {
        const pathD = points.map((p, i) =>
          `${i === 0 ? "M" : "L"} ${toX(i, total)} ${toY(p[key])}`
        ).join(" ");
        return (
          <g key={key}>
            <path d={pathD} fill="none" stroke={LINE_COLORS[key]} strokeWidth={2.5}
              strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
            {points.map((p, i) => (
              <circle key={i} cx={toX(i, total)} cy={toY(p[key])} r={3.5}
                fill={LINE_COLORS[key]} stroke="black" strokeWidth={1.5} />
            ))}
          </g>
        );
      })}

      {/* Event markers */}
      {eventsByRound.map(({ roundIndex, events }) => {
        const x = toX(roundIndex + 1, total); // +1 because index 0 is preState
        return events.map((ev, ei) => {
          const isPositive = POSITIVE_EVENTS.has(ev.event);
          return (
            <g key={`${roundIndex}-${ei}`}>
              <line x1={x} y1={PAD_T} x2={x} y2={PAD_T + CHART_H}
                stroke={isPositive ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}
                strokeWidth={1} strokeDasharray="4 3" />
              <circle cx={x} cy={PAD_T + 8 + ei * 14} r={4}
                fill={isPositive ? "#22c55e" : "#ef4444"} stroke="black" strokeWidth={1} />
              <text x={x + 7} y={PAD_T + 12 + ei * 14}
                fill={isPositive ? "#22c55e" : "#ef4444"} fontSize={9} fontFamily="monospace">
                {EVENT_LABELS[ev.event] || ev.event}
              </text>
            </g>
          );
        });
      })}
    </svg>
  );
}

function RoundCompare({ game }: { game: GameData }) {
  const resolved = game.rounds.filter(r => r.state === "RESOLVED" && r.postState);
  if (resolved.length < 2) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono border-collapse">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="text-left p-2 text-[var(--muted)]">指标</th>
            <th className="p-2 text-[var(--muted)]">初始</th>
            {resolved.map(r => (
              <th key={r.roundIndex} className="p-2 text-[var(--muted)]">R{r.roundIndex + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {WORLD_KEYS.map(key => (
            <tr key={key} className="border-b border-black/30">
              <td className="p-2 font-black" style={{ color: LINE_COLORS[key] }}>
                {WORLD_LABELS[key]}
              </td>
              <td className="p-2 text-center text-[var(--fg)]">
                {resolved[0].preState[key]}
              </td>
              {resolved.map(r => {
                const val = r.postState![key];
                const prev = r.roundIndex === 0
                  ? resolved[0].preState[key]
                  : (resolved[r.roundIndex - 1]?.postState?.[key] ?? val);
                const diff = +(val - prev).toFixed(1);
                return (
                  <td key={r.roundIndex} className="p-2 text-center">
                    <span className="text-[var(--fg)]">{val.toFixed(1)}</span>
                    {diff !== 0 && (
                      <span className={`ml-1 text-[10px] ${diff > 0 ? "text-[var(--comic-red)]" : "text-emerald-400"}`}>
                        {diff > 0 ? "+" : ""}{diff}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ChartsPage() {
  const [games, setGames] = useState<GameData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set(WORLD_KEYS));

  useEffect(() => {
    getGameHistory()
      .then((data) => setGames(data.games || []))
      .catch(() => setError("无法加载数据"))
      .finally(() => setLoading(false));
  }, []);

  const toggleKey = (key: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-4 stagger">
        <div className="skeleton h-8 w-48" />
        <div className="comic-panel p-5"><div className="skeleton h-64 w-full" /></div>
      </div>
    );
  }

  const game = games[selectedIdx];

  return (
    <div className="space-y-5 stagger">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider">世界状态图表</h1>
        <Link href="/" className="comic-btn bg-[var(--comic-yellow)] text-black px-4 py-2 text-sm">
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
          <p className="font-bold uppercase tracking-wider">还没有游戏数据</p>
        </div>
      ) : (
        <>
          {/* Game selector */}
          {games.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {games.map((g, i) => (
                <button key={g.roomId} onClick={() => setSelectedIdx(i)}
                  className={`text-xs px-3 py-1.5 font-bold uppercase tracking-wider border-2 border-black transition-colors cursor-pointer ${
                    i === selectedIdx
                      ? "bg-[var(--comic-yellow)] text-black"
                      : "bg-[var(--comic-dark)] text-[var(--muted)] hover:text-[var(--fg)]"
                  }`}>
                  {new Date(g.createdAt).toLocaleDateString("zh-CN")} · {g.endReason}
                </button>
              ))}
            </div>
          )}

          {game && (
            <>
              {/* Legend / toggle */}
              <div className="comic-panel p-3">
                <div className="flex flex-wrap gap-2">
                  {WORLD_KEYS.map(key => (
                    <button key={key} onClick={() => toggleKey(key)}
                      className={`text-xs px-2.5 py-1 font-bold border-2 border-black transition-all cursor-pointer ${
                        visibleKeys.has(key) ? "" : "opacity-30"
                      }`}
                      style={{ backgroundColor: visibleKeys.has(key) ? LINE_COLORS[key] : "transparent",
                               color: visibleKeys.has(key) ? "#000" : LINE_COLORS[key] }}>
                      {WORLD_LABELS[key]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart */}
              <div className="comic-panel p-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-[var(--muted)] mb-3">
                  指标趋势 · {game.mode === "chaos" ? "混沌模式" : "故事模式"} · {game.roundsPlayed} 回合
                </h3>
                <LineChart game={game} visibleKeys={visibleKeys} />
              </div>

              {/* Round comparison table */}
              <div className="comic-panel p-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-[var(--muted)] mb-3">
                  回合对比
                </h3>
                <RoundCompare game={game} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
