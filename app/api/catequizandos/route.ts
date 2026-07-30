import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { catechistCatechumenFilter } from "@/lib/access";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Não autorizado" } }, { status: 401 });
  const rawPage = Number(request.nextUrl.searchParams.get("page") || 1);
  const rawLimit = Number(request.nextUrl.searchParams.get("limit") || 20);
  if (!Number.isInteger(rawPage) || rawPage < 1 || !Number.isInteger(rawLimit) || rawLimit < 1) {
    return NextResponse.json(
      { error: { code: "INVALID_PAGINATION", message: "Paginação inválida" } },
      { status: 400 },
    );
  }
  const page = rawPage;
  const limit = Math.min(100, rawLimit);
  const q = request.nextUrl.searchParams.get("q")?.trim() || undefined;
  const where = { deletedAt: null, fullName: q ? { contains: q, mode: "insensitive" as const } : undefined, ...catechistCatechumenFilter(session) };
  const [records, total] = await Promise.all([
    prisma.catechumen.findMany({ where, select: { id: true, fullName: true, qrCode: { select: { active: true } } }, skip: (page - 1) * limit, take: limit, orderBy: { fullName: "asc" } }),
    prisma.catechumen.count({ where }),
  ]);
  return NextResponse.json({ data: records, meta: { page, limit, total, pages: Math.ceil(total / limit) } }, { headers: { "Cache-Control": "no-store" } });
}
