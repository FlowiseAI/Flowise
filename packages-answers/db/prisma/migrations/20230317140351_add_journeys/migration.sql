-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "journeyId" TEXT;

-- CreateTable
CREATE TABLE "Journey" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Journey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_JourneyToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_JourneyToUser_AB_unique" ON "_JourneyToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_JourneyToUser_B_index" ON "_JourneyToUser"("B");

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JourneyToUser" ADD CONSTRAINT "_JourneyToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Journey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JourneyToUser" ADD CONSTRAINT "_JourneyToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
