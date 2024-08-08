/*
  Warnings:

  - A unique constraint covering the columns `[userId,messageId]` on the table `MessageFeedback` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "MessageFeedback_userId_messageId_key" ON "MessageFeedback"("userId", "messageId");
