-- DropForeignKey
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_promptId_fkey";

-- AlterTable
ALTER TABLE "Chat" ALTER COLUMN "promptId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
