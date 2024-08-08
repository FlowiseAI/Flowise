/*
  Warnings:

  - You are about to drop the column `userId` on the `Prompt` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Prompt" DROP CONSTRAINT "Prompt_userId_fkey";

-- AlterTable
ALTER TABLE "Prompt" DROP COLUMN "userId";

-- CreateTable
CREATE TABLE "_PromptToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_PromptToUser_AB_unique" ON "_PromptToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_PromptToUser_B_index" ON "_PromptToUser"("B");

-- AddForeignKey
ALTER TABLE "_PromptToUser" ADD CONSTRAINT "_PromptToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PromptToUser" ADD CONSTRAINT "_PromptToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
