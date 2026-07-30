import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "catequese_session";
export type Session = { userId: string; name: string; email: string; role: Role };
type CachedUser = { session: Session | null; expiresAt: number };

const globalForAuth = globalThis as unknown as {
  sessionUsers?: Map<string, CachedUser>;
};
const sessionUsers = globalForAuth.sessionUsers ?? new Map<string, CachedUser>();
globalForAuth.sessionUsers = sessionUsers;

function sessionCacheTtl() {
  const configured = Number(process.env.SESSION_USER_CACHE_TTL_SECONDS || "60");
  return Number.isFinite(configured) && configured >= 0 ? configured * 1000 : 60_000;
}

async function activeUserSession(userId: string) {
  const cached = sessionUsers.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.session;

  const user = await prisma.user.findFirst({
    where: { id: userId, active: true, deletedAt: null },
    select: { id: true, name: true, email: true, role: true },
  });
  const session = user
    ? { userId: user.id, name: user.name, email: user.email, role: user.role }
    : null;
  sessionUsers.set(userId, {
    session,
    expiresAt: Date.now() + sessionCacheTtl(),
  });
  return session;
}

export function invalidateSessionUser(userId: string) {
  sessionUsers.delete(userId);
}

function sessionSecret() {
  const value = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production" && (!value || value.length < 32)) {
    throw new Error("AUTH_SECRET deve possuir pelo menos 32 caracteres em produção.");
  }
  return new TextEncoder().encode(value || "dev-secret-change-me-at-least-32-chars");
}

export async function createSession(payload: Session, remember = false) {
  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8;
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(remember ? "30d" : "8h")
    .sign(sessionSecret());
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge, path: "/" });
}

export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = (await jwtVerify(token, sessionSecret())).payload as unknown as Session;
    if (!payload.userId || !payload.email || !payload.role) return null;
    return activeUserSession(payload.userId);
  } catch { return null; }
});

export async function requireSession(roles?: Role[]) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (roles && !roles.includes(session.role)) redirect("/dashboard?erro=sem-permissao");
  return session;
}

export async function clearSession() { (await cookies()).delete(SESSION_COOKIE); }
