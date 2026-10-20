"use server";

import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authSecret, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";
import {
  clearLoginFailures,
  loginRateLimit,
  registerLoginFailure,
} from "@/lib/login-rate-limit";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().trim().email().transform(email => email.toLowerCase()),
  password: z.string().min(1).max(128),
});

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/login?erro=dados-invalidos");

  const { email, password } = parsed.data;
  const requestHeaders = await headers();
  const ip =
    requestHeaders.get("x-real-ip") ??
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const limit = loginRateLimit(email, ip);
  if (limit.blocked) {
    redirect(`/login?erro=bloqueado&aguarde=${limit.retryAfterSeconds}`);
  }

  let user;
  try {
    user = await prisma.user.findFirst({
      where: { email, active: true, deletedAt: null },
      select: { id: true, passwordHash: true },
    });
  } catch (error) {
    console.error("Falha ao consultar usuário durante o login:", error);
    redirect("/login?erro=banco-indisponivel");
  }

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    registerLoginFailure(email, ip);
    redirect("/login?erro=credenciais");
  }

  clearLoginFailures(email, ip);
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(authSecret());

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect("/dashboard");
}
