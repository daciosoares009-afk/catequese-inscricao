"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/validations/schemas";

export async function selfRegister(formData: FormData) {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/cadastro?erro=dados-invalidos");

  const { name, email, password } = parsed.data;
  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash: await bcrypt.hash(password, 12),
          role: "CATECHIST",
          active: false,
          catechist: { create: {} },
        },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: {
          action: "SELF_REGISTER",
          entity: "User",
          entityId: user.id,
          after: { name, role: "CATECHIST", active: false },
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect("/cadastro?erro=email-existente");
    }
    throw error;
  }

  redirect("/login?cadastro=pendente");
}
