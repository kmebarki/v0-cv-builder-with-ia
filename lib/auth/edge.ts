// lib/auth/edge.ts – Edge-safe helpers (aucun import Node)
import { NextRequest } from "next/server";

/** Option rapide : lire juste le cookie de session BetterAuth */
export function getSessionCookie(req: NextRequest) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/betterauth\.session-token=([^;]+)/);
  return m?.[1] ?? null;
}

/** Option robuste : demander l'état de session à l'API (côté Node) */
export async function fetchSession(req: NextRequest) {
  const url = new URL("/api/auth/session", req.url);
  const res = await fetch(url, {
    headers: { cookie: req.headers.get("cookie") ?? "" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json(); // structure renvoyée par ton /api/auth/session
}
	