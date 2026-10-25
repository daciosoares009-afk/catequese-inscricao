ALTER TABLE "Class" ALTER COLUMN "capacity" SET DEFAULT 100;

UPDATE "Class"
SET "capacity" = 100;
