import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const previousNames: Record<string, string[]> = {
  "Geovanna Isabele da Silva": ["Geovanna Isabelle da Silva"],
  "Gabriell Bezerra dos Santos": ["Gabriel Bezerra dos Santos"],
  "Luís Carlos Rocha Portela": ["Luís Pedro Rocha Portela"],
  "Ana Clara Barrera da Silva": ["Ana Clara Barreira da Silva"],
  "Júlio Vieira Moreira": ["Júlio Vieixo Moreira"],
  "Thyago Ferreira Souza": ["Thiago Ferreira Souza"],
  "Cauã Joaquim Lima Silva": ["Cauã Jorgina Lima Silva"],
  "Lucas Massagardi de Oliveira Caldeira": ["Luan Massingandi de Oliveira Caldeira"],
  "Bruno Miguel dos Santos": ["Bruno Miguel Barcado de Santoro"],
  "Munie Konoulo Silva": ["Munir Konovlo Silva"],
};

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
  let updated = 0;
  let skipped = 0;
  const createdNames: string[] = [];
  const updatedNames: Array<{ before: string; after: string }> = [];

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

    const previous = previousNames[fullName]?.length
      ? await prisma.catechumen.findFirst({
          where: {
            fullName: { in: previousNames[fullName], mode: "insensitive" },
            deletedAt: null,
          },
          select: { id: true, fullName: true },
        })
      : null;

    if (previous) {
      await prisma.catechumen.update({
        where: { id: previous.id },
        data: { fullName },
      });
      updated += 1;
      updatedNames.push({ before: previous.fullName, after: fullName });
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

  if (createdNames.length || updatedNames.length) {
    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN", active: true, deletedAt: null },
      select: { id: true },
    });
    await prisma.auditLog.create({
      data: {
        userId: admin?.id,
        action: "BULK_RECONCILE",
        entity: "Catechumen",
        after: { created: createdNames, updated: updatedNames },
      },
    });
  }

  console.log(`Catequizandos criados: ${created}`);
  console.log(`Catequizandos atualizados: ${updated}`);
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
