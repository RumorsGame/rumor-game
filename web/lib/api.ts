const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6000";

export async function getDefaultRoom() {
  const res = await fetch(`${API_BASE}/api/rooms/default`, {
    cache: "no-store",
  });
  return res.json();
}

export async function getCurrentRound(roomId: string) {
  const res = await fetch(`${API_BASE}/api/rooms/${roomId}/current`, {
    cache: "no-store",
  });
  return res.json();
}

export async function submitAction(
  roomId: string,
  playerId: string,
  submission: Record<string, unknown>,
) {
  const res = await fetch(`${API_BASE}/api/rooms/${roomId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId, submission }),
  });
  return res.json();
}

export async function getRounds(roomId: string) {
  const res = await fetch(`${API_BASE}/api/rooms/${roomId}/rounds`, {
    cache: "no-store",
  });
  return res.json();
}

export async function getRoundDetail(roomId: string, roundIndex: number) {
  const res = await fetch(
    `${API_BASE}/api/rooms/${roomId}/rounds/${roundIndex}`,
    { cache: "no-store" },
  );
  return res.json();
}

export async function getChainVerification(roomId: string, roundIndex: number) {
  const res = await fetch(
    `${API_BASE}/api/rooms/${roomId}/rounds/${roundIndex}/chain`,
    { cache: "no-store" },
  );
  return res.json();
}

export async function startNewGame(mode: "story" | "chaos" | "survival" = "story") {
  const res = await fetch(`${API_BASE}/api/rooms/new-game`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
  return res.json();
}

export async function getGameHistory() {
  const res = await fetch(`${API_BASE}/api/rooms/history`, {
    cache: "no-store",
  });
  return res.json();
}

export async function getAgents() {
  const res = await fetch(`${API_BASE}/api/rooms/agents`, {
    cache: "no-store",
  });
  return res.json();
}
