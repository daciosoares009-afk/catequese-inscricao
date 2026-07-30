-- Garante que um catequizando tenha somente uma matrícula ativa por vez.
-- A regra complementa a transação de transferência na camada de serviço.
CREATE UNIQUE INDEX "Enrollment_one_active_per_catechumen"
ON "Enrollment" ("catechumenId")
WHERE "status" = 'ACTIVE' AND "deletedAt" IS NULL;
