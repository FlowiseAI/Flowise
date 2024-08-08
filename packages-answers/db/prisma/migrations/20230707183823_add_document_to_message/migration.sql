-- CreateTable
CREATE TABLE "_DocumentToMessage" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_DocumentToMessage_AB_unique" ON "_DocumentToMessage"("A", "B");

-- CreateIndex
CREATE INDEX "_DocumentToMessage_B_index" ON "_DocumentToMessage"("B");

-- AddForeignKey
ALTER TABLE "_DocumentToMessage" ADD CONSTRAINT "_DocumentToMessage_A_fkey" FOREIGN KEY ("A") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentToMessage" ADD CONSTRAINT "_DocumentToMessage_B_fkey" FOREIGN KEY ("B") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
