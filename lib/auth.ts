import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { errors, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export type Session = { userId: string; name: string; email: string; role: Role };

export const SESSION_COOKIE = "catequese-session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET deve conter pelo menos 32 caracteres.");
  }
  return new TextEncoder().encode(secret);
}

export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, authSecret());
    if (!payload.sub) return null;
    userId = payload.sub;
  } catch (error) {
    if (error instanceof errors.JOSEError) return null;
    throw error;
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, active: true, deletedAt: null },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) return null;

  return { userId: user.id, name: user.name, email: user.email, role: user.role };
});

export async function requireSession(roles?: Role[]) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (roles && !roles.includes(session.role)) redirect("/dashboard?erro=sem-permissao");
  return session;
}
