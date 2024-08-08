-- AlterTable
ALTER TABLE "Sidekick" ADD COLUMN     "chatflow" JSONB,
ADD COLUMN     "chatflowApiKey" TEXT,
ALTER COLUMN "aiModel" DROP NOT NULL;
