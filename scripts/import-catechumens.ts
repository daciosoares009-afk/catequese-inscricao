import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const filePath = path.join(process.cwd(), "data", "catequizandos-pendentes.csv");
  const csv = await readFile(filePath, "utf8");
  const names = csv
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map((line) => line.split(";")[1]?.trim())
    .filter((name): name is string => Boolean(name));

  let created = 0;
  let skipped = 0;
  const createdNames: string[] = [];

  for (const fullName of names) {
    const existing = await prisma.catechumen.findFirst({
      where: {
        fullName: { equals: fullName, mode: "insensitive" },
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.catechumen.create({
      data: {
        fullName,
        status: "WAITING",
        qrCode: {
          create: { token: randomBytes(32).toString("base64url") },
        },
      },
    });
    created += 1;
    createdNames.push(fullName);
  }

  if (createdNames.length) {
    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN", active: true, deletedAt: null },
      select: { id: true },
    });
    await prisma.auditLog.create({
      data: {
        userId: admin?.id,
        action: "BULK_IMPORT",
        entity: "Catechumen",
        after: { count: createdNames.length, names: createdNames },
      },
    });
  }

  console.log(`Catequizandos criados: ${created}`);
  console.log(`Já existentes, ignorados: ${skipped}`);
  console.log(`Total processado: ${names.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
