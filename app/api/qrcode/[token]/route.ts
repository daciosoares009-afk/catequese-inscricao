import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canAccessCatechumen } from "@/lib/access";
import { isQrCodeTokenFormatValid } from "@/lib/qr-code";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Não autorizado" } }, { status: 401 });
  const { token } = await params;
  if (!isQrCodeTokenFormatValid(token)) return NextResponse.json({ error: { code: "INVALID_QR", message: "QR Code inválido" } }, { status: 404 });
  const qr = await prisma.qRCodeToken.findFirst({ where: { token, active: true, expiresAt: { gt: new Date() }, catechumen: { is: { deletedAt: null, status: { not: "INACTIVE" } } } }, include: { catechumen: { include: { community: true, enrollments: { where: { status: "ACTIVE", deletedAt: null, class: { deletedAt: null } }, include: { class: { include: { sacrament: true } } }, take: 1 } } } } });
  if (!qr || !(await canAccessCatechumen(session, qr.catechumenId))) return NextResponse.json({ error: { code: "INVALID_QR", message: "QR Code inválido" } }, { status: 404 });
  const catechumen = qr.catechumen;
  return NextResponse.json({ data: { id: catechumen.id, name: catechumen.fullName, photoUrl: catechumen.photoUrl, status: catechumen.status, community: catechumen.community?.name, className: catechumen.enrollments[0]?.class.name, sacrament: catechumen.enrollments[0]?.class.sacrament.name } }, { headers: { "Cache-Control": "no-store" } });
}
