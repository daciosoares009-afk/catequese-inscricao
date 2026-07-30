import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { catechistCatechumenFilter } from "@/lib/access";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Não autorizado" } }, { status: 401 });
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("limit") || 20)));
  const q = request.nextUrl.searchParams.get("q")?.trim() || undefined;
  const where = { deletedAt: null, fullName: q ? { contains: q, mode: "insensitive" as const } : undefined, ...catechistCatechumenFilter(session) };
  const [records, total] = await Promise.all([
    prisma.catechumen.findMany({ where, select: { id: true, fullName: true, birthDate: true, status: true, community: { select: { id: true, name: true } }, enrollments: { where: { status: "ACTIVE" }, select: { class: { select: { id: true, name: true } } }, take: 1 } }, skip: (page - 1) * limit, take: limit, orderBy: { fullName: "asc" } }),
    prisma.catechumen.count({ where }),
  ]);
  return NextResponse.json({ data: records, meta: { page, limit, total, pages: Math.ceil(total / limit) } }, { headers: { "Cache-Control": "no-store" } });
}
