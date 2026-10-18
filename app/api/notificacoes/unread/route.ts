import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const count = await prisma.notification.count({
    where: { userId: session.userId, readAt: null },
  });
  return NextResponse.json(
    { count },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
