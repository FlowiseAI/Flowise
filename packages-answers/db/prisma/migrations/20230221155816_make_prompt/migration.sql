/*
  Warnings:

  - A unique constraint covering the columns `[prompt]` on the table `Prompt` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `dislikes` to the `Prompt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `usages` to the `Prompt` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Prompt" ADD COLUMN     "dislikes" INTEGER NOT NULL,
ADD COLUMN     "usages" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Prompt_prompt_key" ON "Prompt"("prompt");
