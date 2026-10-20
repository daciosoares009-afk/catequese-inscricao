UPDATE "QRCodeToken"
SET "expiresAt" = "generatedAt" + INTERVAL '365 days'
WHERE "expiresAt" IS NULL;

ALTER TABLE "QRCodeToken"
ALTER COLUMN "expiresAt" SET NOT NULL;
