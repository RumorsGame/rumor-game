import { prisma } from "../prismaClient.js";
import { drawCard } from "../../rumorCards.js";
import { DEFAULT_WORLD } from "../../types.js";
import type { WorldState, ResolveEnv } from "../../types.js";

export async function createRoom(mode: "story" | "chaos" | "survival") {
  const room = await prisma.room.create({ data: { mode } });
  return room;
}

export async function getOrCreateDefaultRoom() {
  // Find the latest room
  const existing = await prisma.room.findFirst({
    orderBy: { createdAt: "desc" },
    include: { rounds: { orderBy: { roundIndex: "desc" }, take: 1 } },
  });

  if (existing) {
    const lastRound = existing.rounds[0];
    const normalEnd = (existing.mode === "story"
      && lastRound
      && lastRound.state === "RESOLVED"
      && lastRound.roundIndex >= 5)
      || (existing.mode === "chaos"
      && lastRound
      && lastRound.state === "RESOLVED"
      && lastRound.roundIndex >= 9);

    // Check for early collapse
    let earlyCollapse = false;
    if (lastRound?.state === "RESOLVED" && lastRound.report) {
      try {
        const report = JSON.parse(lastRound.report);
        earlyCollapse = report.triggeredEvents?.some((e: any) => e.event === "systemic_collapse") ?? false;
      } catch {}
    }

    // Return existing room — let the caller decide what to do with gameOver
    return { room: existing, roomId: existing.id, gameOver: normalEnd || earlyCollapse };
  }

  // No room exists at all — create one
  const room = await prisma.room.create({ data: { mode: "story" } });
  return { room, roomId: room.id, gameOver: false };
}

/** Create a fresh room for a new game */
export async function createNewGame(mode: "story" | "chaos" | "survival" = "story") {
  const room = await prisma.room.create({ data: { mode } });
  return { room, roomId: room.id };
}

export async function getRoom(roomId: string) {
  return prisma.room.findUnique({
    where: { id: roomId },
    include: { rounds: { orderBy: { roundIndex: "asc" } } },
  });
}

export async function startOrGetCurrentRound(roomId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { rounds: { orderBy: { roundIndex: "desc" }, take: 1 } },
  });
  if (!room) throw new Error("Room not found");

  // If there's an unresolved round, return it
  const lastRound = room.rounds[0];
  if (lastRound && lastRound.state === "WAITING_SUBMISSIONS") {
    return lastRound;
  }

  // Determine next round index
  const nextIndex = lastRound ? lastRound.roundIndex + 1 : 0;

  // Story mode: max 6 rounds; Chaos mode: max 10 rounds; Survival: unlimited
  if (room.mode === "story" && nextIndex >= 6) {
    return null; // game over
  }
  if (room.mode === "chaos" && nextIndex >= 10) {
    return null; // game over
  }

  // Get env from last round or default
  const env: ResolveEnv = lastRound
    ? JSON.parse(lastRound.env)
    : { nextShockBonus: 0 };

  // Get preState from last round's postState or default
  const preState: WorldState = lastRound?.postState
    ? JSON.parse(lastRound.postState)
    : { ...DEFAULT_WORLD };

  // Draw card
  const card = drawCard(room.mode as "story" | "chaos" | "survival", nextIndex);

  const round = await prisma.round.create({
    data: {
      roomId,
      roundIndex: nextIndex,
      rumorCardId: card.id,
      state: "WAITING_SUBMISSIONS",
      preState: JSON.stringify(preState),
      env: JSON.stringify(env),
    },
  });

  return round;
}

export async function getRoundsByRoom(roomId: string) {
  return prisma.round.findMany({
    where: { roomId },
    orderBy: { roundIndex: "asc" },
    include: { submissions: true },
  });
}

export async function getRoundDetail(roomId: string, roundIndex: number) {
  return prisma.round.findUnique({
    where: { roomId_roundIndex: { roomId, roundIndex } },
    include: { submissions: { orderBy: { createdAt: "asc" } } },
  });
}

/** List all games (rooms) with summary info */
export async function getAllGames() {
  const rooms = await prisma.room.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      rounds: {
        orderBy: { roundIndex: "asc" },
        select: {
          roundIndex: true,
          rumorCardId: true,
          state: true,
          preState: true,
          postState: true,
          report: true,
          narrative: true,
          gameNarrative: true,
          resolvedAt: true,
          chainTxHash: true,
          submissions: {
            select: { playerId: true, agentName: true, action: true, intensity: true, signals: true, confidence: true, narrative: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  return rooms.map((room) => {
    const lastRound = room.rounds[room.rounds.length - 1];
    const lastReport = lastRound?.report ? JSON.parse(lastRound.report) : null;
    const hasCollapse = lastReport?.triggeredEvents?.some((e: any) => e.event === "systemic_collapse") ?? false;
    const isComplete = (lastRound?.state === "RESOLVED" && lastRound.roundIndex >= 5) || hasCollapse;

    return {
      roomId: room.id,
      mode: room.mode,
      createdAt: room.createdAt,
      roundsPlayed: room.rounds.filter(r => r.state === "RESOLVED").length,
      totalRounds: room.rounds.length,
      isComplete,
      endReason: hasCollapse ? "系统性崩溃" : isComplete ? "正常结束" : "进行中",
      gameNarrative: lastRound?.gameNarrative || null,
      rounds: room.rounds.map((r) => {
        const report = r.report ? JSON.parse(r.report) : null;
        return {
          roundIndex: r.roundIndex,
          rumorCardId: r.rumorCardId,
          state: r.state,
          preState: JSON.parse(r.preState),
          postState: r.postState ? JSON.parse(r.postState) : null,
          report,
          narrative: r.narrative || null,
          chainTxHash: r.chainTxHash || null,
          submissions: r.submissions.map(s => ({
            ...s,
            signals: JSON.parse(s.signals),
          })),
        };
      }),
    };
  });
}
