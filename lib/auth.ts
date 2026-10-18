import { cache } from "react";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type Session = { userId: string; name: string; email: string; role: Role };

export const getSession = cache(async (): Promise<Session> => {
  const activeUserFilter = { active: true, deletedAt: null };
  const user =
    (await prisma.user.findFirst({
      where: { ...activeUserFilter, role: "ADMIN" },
      select: { id: true, name: true, email: true },
    })) ??
    (await prisma.user.findFirst({
      where: activeUserFilter,
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true },
    }));

  if (!user) {
    throw new Error("Não há usuário ativo no banco para habilitar o acesso público. Execute o seed inicial.");
  }

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: "ADMIN",
  };
});

export async function requireSession(_roles?: Role[]) {
  return getSession();
}
