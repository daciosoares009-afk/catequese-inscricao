import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "catequese_session";
export type Session = { userId: string; name: string; email: string; role: Role };

function sessionSecret() {
  const value = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production" && (!value || value.length < 32)) {
    throw new Error("AUTH_SECRET deve possuir pelo menos 32 caracteres em produção.");
  }
  return new TextEncoder().encode(value || "dev-secret-change-me-at-least-32-chars");
}

export async function createSession(payload: Session) {
  const token = await new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(sessionSecret());
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 8, path: "/" });
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = (await jwtVerify(token, sessionSecret())).payload as unknown as Session;
    if (!payload.userId || !payload.email || !payload.role) return null;
    const user = await prisma.user.findFirst({ where: { id: payload.userId, active: true, deletedAt: null }, select: { id: true, name: true, email: true, role: true } });
    return user ? { userId: user.id, name: user.name, email: user.email, role: user.role } : null;
  } catch { return null; }
}

export async function requireSession(roles?: Role[]) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (roles && !roles.includes(session.role)) redirect("/dashboard?erro=sem-permissao");
  return session;
}

export async function clearSession() { (await cookies()).delete(SESSION_COOKIE); }
