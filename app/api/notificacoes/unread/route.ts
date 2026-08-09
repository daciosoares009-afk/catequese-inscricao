import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const [count, parish] = await Promise.all([
    prisma.notification.count({ where: { userId: session.userId, readAt: null } }),
    prisma.parish.findFirst({ where: { deletedAt: null }, select: { name: true }, orderBy: { createdAt: "asc" } }),
  ]);
  return NextResponse.json(
    { count, parishName: parish?.name || null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
