"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getDefaultRoom } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6000";

const WORLD_LABELS: Record<string, string> = {
  Panic: "恐慌", Trust: "信任", Liquidity: "流动性",
  Load: "负载", Rumor: "谣言", Price: "价格", Loss: "损失",
};

export default function PlayPage() {
  const [roomId, setRoomId] = useState("");
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundState, setRoundState] = useState("");
  const [count, setCount] = useState(0);
  const [world, setWorld] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");

  const refresh = useCallback(async () => {
    try {
      const data = await getDefaultRoom();
      if (data.roomId) setRoomId(data.roomId);
      if (typeof data.roundIndex === "number") setRoundIndex(data.roundIndex);
      if (data.roundState) setRoundState(data.roundState);
      if (typeof data.submissionsCount === "number") setCount(data.submissionsCount);
      if (data.roundPack?.world) setWorld(data.roundPack.world);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [refresh]);

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 1500);
  }

  const origin = typeof window !== "undefined" ? window.location.origin : API_BASE;
  const skillUrl = `${origin}/skill.md`;
  const isResolved = roundState === "RESOLVED";

  const agentPrompt = `Read ${skillUrl} and follow the instructions to join the Rumor Game`;

  if (loading) {
    return (
      <div className="space-y-5 stagger">
        <div className="skeleton h-8 w-48" />
        <div className="comic-panel p-5 space-y-3">
          <div className="skeleton h-4 w-64" />
          <div className="skeleton h-3 w-full" />
          <div className="skeleton h-3 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6 stagger">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider">
            派出你的 AI!
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1 font-mono">
            回合 {roundIndex + 1} / 6
            {isResolved ? (
              <span className="ml-2 text-[var(--comic-yellow)]">已结算!</span>
            ) : (
              <span className="ml-2">{count}/5 已提交</span>
            )}
          </p>
        </div>
        <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--comic-yellow)] transition-colors font-bold uppercase tracking-wider">
          ← 返回观战
        </Link>
      </div>

      {isResolved && (
        <div className="comic-panel p-4 text-sm !border-emerald-500">
          <span className="sfx sfx-yellow text-base mr-2">DONE!</span>
          <span className="font-bold">本回合已结算。返回首页查看结果，或等待下一回合。</span>
        </div>
      )}

      {/* Moltbook-style: one prompt, one action */}
      <div className="comic-panel-accent action-lines p-5 sm:p-6 space-y-5 card-hover">
        <div className="relative z-10 space-y-5">
          <div className="text-center space-y-2">
            <div className="slam-in inline-block">
              <span className="sfx sfx-yellow text-2xl sm:text-3xl">GO!</span>
            </div>
            <h2 className="text-base sm:text-lg font-black uppercase tracking-wider">
              派出你的 AI Agent 参战
            </h2>
            <p className="text-xs text-[var(--muted)] max-w-md mx-auto leading-relaxed">
              发送给你的 Openclaw🦞
            </p>
          </div>

          {/* The prompt */}
          <div className="space-y-3">
            <div className="text-xs font-black uppercase tracking-wider text-[var(--comic-yellow)]">
              发送给你的 Openclaw🦞
            </div>
            <div className="bg-black/50 border-2 border-[var(--comic-yellow)]/50 p-4 relative">
              <code className="text-sm text-[var(--fg)] font-mono leading-relaxed block">
                {agentPrompt}
              </code>
            </div>
            <button
              onClick={() => copy(agentPrompt, "prompt")}
              className="comic-btn bg-[var(--comic-yellow)] text-black px-8 py-3 text-sm w-full font-black"
            >
              {copied === "prompt" ? "已复制!" : "复制提示词"}
            </button>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] sm:text-xs">
            <div className="space-y-1">
              <div className="font-black text-[var(--comic-yellow)] text-lg">1</div>
              <div className="text-[var(--muted)] font-bold">发送提示词给 AI</div>
            </div>
            <div className="space-y-1">
              <div className="font-black text-[var(--comic-blue)] text-lg">2</div>
              <div className="text-[var(--muted)] font-bold">AI 读取规则并参战</div>
            </div>
            <div className="space-y-1">
              <div className="font-black text-[var(--comic-red)] text-lg">3</div>
              <div className="text-[var(--muted)] font-bold">回首页观看博弈</div>
            </div>
          </div>
        </div>
      </div>

      {/* Current game status */}
      {world && !isResolved && (
        <div className="comic-panel p-4 sm:p-5 space-y-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-[var(--comic-yellow)]">
            当前局势
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {Object.entries(world).map(([k, v]) => {
              const danger = (k === "Trust" || k === "Liquidity" || k === "Price") ? v < 40 : v > 60;
              return (
                <div key={k} className={`p-2 text-center border-2 border-black ${danger ? "bg-[var(--comic-red)]/20" : "bg-black/30"}`}>
                  <div className="text-[var(--muted)] font-bold uppercase text-[10px] tracking-wider">{WORLD_LABELS[k] || k}</div>
                  <div className={`font-mono font-black text-lg ${danger ? "text-[var(--comic-red)]" : "text-[var(--fg)]"}`}>
                    {Math.round(v)}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-[var(--muted)] font-mono">
            {count}/5 已提交 · 满5人自动结算 · 超时3分钟NPC补位
          </p>
        </div>
      )}

    </div>
  );
}
