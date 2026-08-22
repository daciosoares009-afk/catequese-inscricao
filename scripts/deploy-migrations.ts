import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvFile } from "node:process";
import { Client } from "pg";

loadEnvFile(".env");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL não está configurada.");
}

const migrationsDirectory = path.join(process.cwd(), "prisma", "migrations");
const poolerUrl = new URL(connectionString);
poolerUrl.searchParams.delete("sslmode");
const client = new Client({
  connectionString: poolerUrl.toString(),
  // Exige TLS com certificado válido; não aceite certificados autoassinados.
  ssl: { rejectUnauthorized: true },
});

async function ensureMigrationTable() {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) PRIMARY KEY NOT NULL,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )
  `);
}

async function applyMigration(name: string) {
  const existing = await client.query<{ finished_at: Date | null }>(
    `SELECT "finished_at" FROM "_prisma_migrations"
     WHERE "migration_name" = $1 AND "rolled_back_at" IS NULL
     ORDER BY "started_at" DESC LIMIT 1`,
    [name],
  );

  if (existing.rows[0]?.finished_at) {
    console.log(`Ignorada (já aplicada): ${name}`);
    return;
  }

  const sql = await readFile(
    path.join(migrationsDirectory, name, "migration.sql"),
    "utf8",
  );
  const checksum = createHash("sha256").update(sql).digest("hex");
  const id = randomUUID();

  await client.query("BEGIN");
  try {
    await client.query(
      `INSERT INTO "_prisma_migrations"
       ("id", "checksum", "migration_name", "started_at", "applied_steps_count")
       VALUES ($1, $2, $3, now(), 0)`,
      [id, checksum, name],
    );
    await client.query(sql);
    await client.query(
      `UPDATE "_prisma_migrations"
       SET "finished_at" = now(), "applied_steps_count" = 1
       WHERE "id" = $1`,
      [id],
    );
    await client.query("COMMIT");
    console.log(`Aplicada: ${name}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function main() {
  await client.connect();
  await ensureMigrationTable();

  const entries = await readdir(migrationsDirectory, { withFileTypes: true });
  const migrations = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const migration of migrations) {
    await applyMigration(migration);
  }

  console.log("Migrações concluídas.");
}

main()
  .catch((error) => {
    console.error(
      "Falha ao aplicar migrações:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end().catch(() => undefined);
  });
