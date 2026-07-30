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

  console.log("Conexão com o banco estabelecida.");
  console.log(`Host: ${databaseHost()}`);
  console.log(`Banco: ${connection.database}`);
  console.log(`Horário do servidor: ${connection.timestamp.toISOString()}`);
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
