import { prisma } from "../lib/prisma";

function databaseHost() {
  try {
    return new URL(process.env.DATABASE_URL ?? "").hostname || "desconhecido";
  } catch {
    return "URL inválida";
  }
}

async function main() {
  const result = await prisma.$queryRaw<Array<{ database: string; timestamp: Date }>>`
    SELECT current_database() AS database, now() AS timestamp
  `;
  const connection = result[0];
  const [tables] = await prisma.$queryRaw<
    Array<{
      users: string | null;
      catechumens: string | null;
      migrations: string | null;
    }>
  >`
    SELECT
      to_regclass('public."User"')::text AS users,
      to_regclass('public."Catechumen"')::text AS catechumens,
      to_regclass('public._prisma_migrations')::text AS migrations
  `;

  console.log("Conexão com o banco estabelecida.");
  console.log(`Host: ${databaseHost()}`);
  console.log(`Banco: ${connection.database}`);
  console.log(`Horário do servidor: ${connection.timestamp.toISOString()}`);
  console.log(
    tables.users && tables.catechumens && tables.migrations
      ? "Estrutura do sistema: pronta"
      : "Estrutura do sistema: ainda não criada",
  );
}

main()
  .catch((error) => {
    console.error(`Não foi possível conectar ao banco em ${databaseHost()}.`);
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
