/*
  Warnings:

  - A unique constraint covering the columns `[aiRequestId]` on the table `Message` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "aiRequestId" TEXT;

-- CreateTable
CREATE TABLE "AiRequest" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL,
    "tokensUsedUser" INTEGER NOT NULL,
    "costUsdTotal" DECIMAL(65,30) NOT NULL,
    "costUsdTotalUser" DECIMAL(65,30) NOT NULL,
    "userId" TEXT NOT NULL,
    "request" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Message_aiRequestId_key" ON "Message"("aiRequestId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_aiRequestId_fkey" FOREIGN KEY ("aiRequestId") REFERENCES "AiRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRequest" ADD CONSTRAINT "AiRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
