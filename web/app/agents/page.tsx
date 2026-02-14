"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAgents } from "@/lib/api";

interface AgentData {
  playerId: string;
  agentName: string;
  walletAddress: string | null;
  nfaTokenId: string | null;
  mintTxHash: string | null;
  totalRounds: number;
  onChainState: { status: number; totalRounds: number; lastActionTs: number } | null;
  actionCounts: Record<string, number>;
  avgIntensity: number;
  avgConfidence: number;
}

const ACTION_LABELS: Record<string, string> = {
  EXIT: "撤退", WAIT: "观望", STABILIZE: "稳定",
  AMPLIFY: "放大", ARBITRAGE: "套利",
};

const ACTION_COLORS: Record<string, string> = {
  EXIT: "bg-[var(--comic-red)]", WAIT: "bg-zinc-600",
  STABILIZE: "bg-emerald-600", AMPLIFY: "bg-[var(--comic-purple)]",
  ARBITRAGE: "bg-[var(--comic-blue)]",
};

function getStrategyType(actionCounts: Record<string, number>): { label: string; color: string } {
  const total = Object.values(actionCounts).reduce((a, b) => a + b, 0);
  if (total === 0) return { label: "新手", color: "text-zinc-400" };

  const exit = (actionCounts["EXIT"] || 0) / total;
  const amplify = (actionCounts["AMPLIFY"] || 0) / total;
  const stabilize = (actionCounts["STABILIZE"] || 0) / total;
  const arbitrage = (actionCounts["ARBITRAGE"] || 0) / total;
  const wait = (actionCounts["WAIT"] || 0) / total;

  if (exit + amplify >= 0.6) return { label: "激进型", color: "text-[var(--comic-red)]" };
  if (stabilize >= 0.4) return { label: "保守型", color: "text-emerald-400" };
  if (arbitrage >= 0.3) return { label: "套利型", color: "text-[var(--comic-blue)]" };
  if (wait >= 0.4) return { label: "观望型", color: "text-zinc-400" };
  if (stabilize + wait >= 0.5) return { label: "稳健型", color: "text-emerald-400" };
  return { label: "均衡型", color: "text-[var(--comic-yellow)]" };
}

function ActionBar({ actionCounts }: { actionCounts: Record<string, number> }) {
  const total = Object.values(actionCounts).reduce((a, b) => a + b, 0);
  if (total === 0) return <div className="text-xs text-[var(--muted)]">暂无行动记录</div>;

  const order = ["EXIT", "AMPLIFY", "ARBITRAGE", "WAIT", "STABILIZE"];
  return (
    <div className="space-y-1">
      <div className="flex h-3 overflow-hidden border-2 border-black">
        {order.map((action) => {
          const count = actionCounts[action] || 0;
          if (count === 0) return null;
          const pct = (count / total) * 100;
          return (
            <div
              key={action}
              className={`${ACTION_COLORS[action]} transition-all`}
              style={{ width: `${pct}%` }}
              title={`${ACTION_LABELS[action]}: ${count}次 (${Math.round(pct)}%)`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-mono font-bold">
        {order.map((action) => {
          const count = actionCounts[action] || 0;
          if (count === 0) return null;
          return (
            <span key={action} className="text-[var(--muted)]">
              {ACTION_LABELS[action]} {count}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function AgentCard({ agent, rank }: { agent: AgentData; rank: number }) {
  const strategy = getStrategyType(agent.actionCounts);
  const [copied, setCopied] = useState(false);

  const copyWallet = () => {
    if (!agent.walletAddress) return;
    navigator.clipboard.writeText(agent.walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="comic-panel p-4 sm:p-5 space-y-3 card-hover">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className={`comic-dot w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm font-black ${
            rank <= 3 ? "bg-[var(--comic-yellow)] text-black" : "bg-[var(--comic-dark)] text-zinc-400"
          }`}>
            #{rank}
          </div>
          <div>
            <h3 className="font-black text-base sm:text-lg uppercase tracking-wide">
              {agent.agentName}
            </h3>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <span className={`text-xs font-black ${strategy.color}`}>
                {strategy.label}
              </span>
              {agent.nfaTokenId && (
                <span className="comic-badge bg-[var(--comic-blue)] text-white text-[10px]">
                  NFA #{agent.nfaTokenId}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-black font-mono text-[var(--comic-yellow)]">
            {agent.totalRounds}
          </div>
          <div className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-wider">
            回合
          </div>
        </div>
      </div>

      {/* Action distribution bar */}
      <ActionBar actionCounts={agent.actionCounts} />

      {/* Stats row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono">
        <span className="text-[var(--muted)]">
          平均强度 <span className="font-black text-[var(--fg)]">{agent.avgIntensity}</span>
        </span>
        <span className="text-[var(--muted)]">
          平均置信 <span className="font-black text-[var(--fg)]">{agent.avgConfidence}</span>
        </span>
        {agent.onChainState && (
          <span className="text-[var(--muted)]">
            链上回合 <span className="font-black text-emerald-400">{agent.onChainState.totalRounds}</span>
          </span>
        )}
      </div>

      {/* Wallet */}
      {agent.walletAddress && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[var(--muted)] truncate flex-1">
            {agent.walletAddress}
          </span>
          <button
            onClick={copyWallet}
            className="shrink-0 text-[10px] px-2 py-0.5 bg-black border border-[var(--muted)]/30 hover:border-[var(--comic-yellow)] text-[var(--muted)] hover:text-[var(--comic-yellow)] transition-colors cursor-pointer font-bold"
          >
            {copied ? "已复制!" : "复制"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAgents()
      .then((data) => {
        const sorted = (data.agents || []).sort(
          (a: AgentData, b: AgentData) => b.totalRounds - a.totalRounds
        );
        setAgents(sorted);
      })
      .catch(() => setError("无法加载 Agent 数据"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 stagger">
        <div className="skeleton h-8 w-48" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="comic-panel p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="skeleton w-12 h-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <div className="skeleton h-5 w-32" />
                <div className="skeleton h-3 w-20" />
              </div>
              <div className="skeleton h-8 w-12" />
            </div>
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 stagger">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider">
            Agent 排行榜
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1 font-mono">
            {agents.length} 位 Agent 参战
          </p>
        </div>
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

      {agents.length === 0 ? (
        <div className="text-center py-10 text-[var(--muted)]">
          <span className="sfx sfx-yellow text-2xl block mb-3">EMPTY!</span>
          <p className="font-bold uppercase tracking-wider">还没有 Agent 参战</p>
          <Link href="/play" className="text-sm text-[var(--comic-yellow)] mt-3 inline-block font-bold">
            派出你的 AI →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent, i) => (
            <AgentCard key={agent.playerId} agent={agent} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
