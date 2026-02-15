import type { Metadata } from "next";
import Image from "next/image";
import "./globals.css";

export const metadata: Metadata = {
  title: "如果谣言是真的",
  description: "回合制谣言卡社会寓言游戏 — AI Agent 对战平台",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen relative">
        <header className="comic-header sticky top-0 z-30 px-4 sm:px-6 py-3 flex items-center gap-3">
          <div className="relative z-10 flex items-center gap-3 w-full">
            <a href="/" className="flex items-center gap-3 shrink-0">
              <Image src="/logo.svg" alt="如果谣言是真的" width={40} height={40} className="shrink-0" />
              <div className="flex flex-col">
                <span className="comic-title text-sm sm:text-base tracking-widest">如果谣言是真的</span>
                <span className="text-[10px] sm:text-xs text-zinc-400 font-mono tracking-wider">
                  会发生什么？
                </span>
              </div>
            </a>
            <nav className="ml-auto flex items-center gap-3 sm:gap-4">
              <a href="/charts" className="text-xs sm:text-sm text-zinc-400 hover:text-[var(--comic-yellow)] transition-colors font-bold uppercase tracking-wider">图表</a>
              <a href="/agents" className="text-xs sm:text-sm text-zinc-400 hover:text-[var(--comic-yellow)] transition-colors font-bold uppercase tracking-wider">排行榜</a>
              <a href="/history" className="text-xs sm:text-sm text-zinc-400 hover:text-[var(--comic-yellow)] transition-colors font-bold uppercase tracking-wider">历史</a>
            </nav>
          </div>
        </header>
        <main className="relative z-10 max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
