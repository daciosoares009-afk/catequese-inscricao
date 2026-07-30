import type { Session } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export function catechistClassFilter(session: Session) {
  return session.role === "CATECHIST"
    ? { catechists: { some: { catechist: { userId: session.userId, deletedAt: null } } } }
    : {};
}

export function catechistCatechumenFilter(session: Session) {
  return session.role === "CATECHIST"
    ? { enrollments: { some: { status: "ACTIVE" as const, class: catechistClassFilter(session) } } }
    : {};
}

export async function canAccessClass(session: Session, classId: string) {
  const item = await prisma.class.findFirst({
    where: { id: classId, deletedAt: null, ...catechistClassFilter(session) },
    select: { id: true },
  });
  return Boolean(item);
}

export async function canAccessCatechumen(session: Session, catechumenId: string) {
  const item = await prisma.catechumen.findFirst({
    where: { id: catechumenId, deletedAt: null, ...catechistCatechumenFilter(session) },
    select: { id: true },
  });
  return Boolean(item);
}
