-- AlterTable
ALTER TABLE "Authenticator" ALTER COLUMN "label" DROP NOT NULL,
ALTER COLUMN "label" SET DEFAULT '';
