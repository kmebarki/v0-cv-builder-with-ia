/*
  Warnings:

  - You are about to drop the column `isPublic` on the `UserCv` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[fieldId,userId,cvKey]` on the table `AdminFieldValue` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."AdminFieldValue_fieldId_userId_cvId_key";

-- AlterTable
ALTER TABLE "AdminFieldValue" ADD COLUMN     "cvKey" TEXT NOT NULL DEFAULT '';

-- Backfill cvKey à partir de cvId (vide si NULL)
UPDATE "AdminFieldValue"
SET "cvKey" = COALESCE("cvId", '')
WHERE "cvKey" IS NULL OR "cvKey" = '';

-- Dédoublonnage: on garde la ligne la plus récente par (fieldId,userId,cvKey)
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "fieldId","userId",COALESCE("cvId",'')
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS rn
  FROM "AdminFieldValue"
)
DELETE FROM "AdminFieldValue" a
USING ranked r
WHERE a."id" = r."id"
  AND r.rn > 1;


-- AlterTable
UPDATE "Authenticator" SET "label" = '' WHERE "label" IS NULL;
ALTER TABLE "Authenticator" ALTER COLUMN "label" SET NOT NULL;

-- AlterTable
ALTER TABLE "UserCv" ADD COLUMN "visibility" "CvVisibility" NOT NULL DEFAULT 'PRIVATE';

-- 2) Migrer les données depuis isPublic
UPDATE "UserCv" SET "visibility" = 'PUBLIC'  WHERE "isPublic" = TRUE;
UPDATE "UserCv" SET "visibility" = 'PRIVATE' WHERE "isPublic" = FALSE OR "isPublic" IS NULL;

-- 3) Supprimer la colonne isPublic
ALTER TABLE "UserCv" DROP COLUMN "isPublic";

-- CreateIndex
CREATE UNIQUE INDEX "AdminFieldValue_fieldId_userId_cvKey_key" ON "AdminFieldValue"("fieldId", "userId", "cvKey");

-- CreateIndex
CREATE INDEX "Education_userId_displayOrder_idx" ON "Education"("userId", "displayOrder");

-- CreateIndex
CREATE INDEX "Education_userId_startDate_idx" ON "Education"("userId", "startDate");

-- CreateIndex
CREATE INDEX "Experience_userId_displayOrder_idx" ON "Experience"("userId", "displayOrder");

-- CreateIndex
CREATE INDEX "Experience_userId_startDate_idx" ON "Experience"("userId", "startDate");

-- CreateIndex
CREATE INDEX "MediaAsset_userId_idx" ON "MediaAsset"("userId");

-- CreateIndex
CREATE INDEX "MediaAsset_userId_updatedAt_idx" ON "MediaAsset"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "MediaAssetTag_tagId_idx" ON "MediaAssetTag"("tagId");

-- AddForeignKey
ALTER TABLE "DesignTokenSet" ADD CONSTRAINT "DesignTokenSet_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
