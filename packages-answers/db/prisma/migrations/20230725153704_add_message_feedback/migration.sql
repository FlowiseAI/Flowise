-- CreateEnum
CREATE TYPE "Rating" AS ENUM ('thumbsUp', 'thumbsDown');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "sidekickJson" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "MessageFeedback" (
    "id" TEXT NOT NULL,
    "rating" "Rating" NOT NULL DEFAULT 'thumbsUp',
    "content" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MessageFeedback_messageId_key" ON "MessageFeedback"("messageId");

-- AddForeignKey
ALTER TABLE "MessageFeedback" ADD CONSTRAINT "MessageFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageFeedback" ADD CONSTRAINT "MessageFeedback_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
