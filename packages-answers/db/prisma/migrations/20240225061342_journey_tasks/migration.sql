-- CreateTable
CREATE TABLE "Tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SidekickToTasks" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_SidekickToTasks_AB_unique" ON "_SidekickToTasks"("A", "B");

-- CreateIndex
CREATE INDEX "_SidekickToTasks_B_index" ON "_SidekickToTasks"("B");

-- AddForeignKey
ALTER TABLE "_SidekickToTasks" ADD CONSTRAINT "_SidekickToTasks_A_fkey" FOREIGN KEY ("A") REFERENCES "Sidekick"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SidekickToTasks" ADD CONSTRAINT "_SidekickToTasks_B_fkey" FOREIGN KEY ("B") REFERENCES "Tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
