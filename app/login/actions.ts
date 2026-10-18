"use server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { loginSchema, registerSchema } from "@/validations/schemas";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  clearLoginFailures,
  loginRateLimit,
  registerLoginFailure,
} from "@/lib/login-rate-limit";

export async function loginAction(_: { error: string }, formData: FormData): Promise<{ error: string }> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Informe um e-mail e uma senha válidos." };
  const requestHeaders = await headers();
  const ip =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "local";
  const rate = loginRateLimit(parsed.data.email, ip);
  if (rate.blocked) {
    return {
      error: `Muitas tentativas. Aguarde ${Math.ceil(rate.retryAfterSeconds / 60)} minuto(s).`,
    };
  }
  let user;
  try {
    user = await prisma.user.findFirst({ where: { email: parsed.data.email.toLowerCase(), active: true, deletedAt: null } });
  } catch (error) {
    console.error("Falha ao acessar o banco durante o login", error);
    return { error: "O banco de dados ainda não está disponível. Verifique a configuração local e tente novamente." };
  }
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    registerLoginFailure(parsed.data.email, ip);
    return { error: "E-mail ou senha incorretos." };
  }
  clearLoginFailures(parsed.data.email, ip);
  await createSession(
    { userId:user.id,name:user.name,email:user.email,role:user.role },
    formData.get("remember") === "on",
  );
  try {
    await prisma.auditLog.create({ data:{ userId:user.id,action:"LOGIN",entity:"User",entityId:user.id } });
  } catch (error) {
    console.error("Falha ao registrar auditoria do login", error);
  }
  redirect("/dashboard");
}

type RegisterState = { error: string; success: boolean };

export async function registerAction(_: RegisterState, formData: FormData): Promise<RegisterState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue?.message || "Confira os dados informados.", success: false };
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
    if (existing) return { error: "Este e-mail já está cadastrado.", success: false };

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await prisma.user.create({
      data: { name: parsed.data.name, email: parsed.data.email, passwordHash, role: "CATECHIST" },
      select: { id: true },
    });
    return { error: "", success: true };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return { error: "Este e-mail já está cadastrado.", success: false };
    }
    console.error("Falha ao criar conta", error);
    return { error: "Não foi possível criar sua conta agora. Tente novamente." , success: false };
  }
}
