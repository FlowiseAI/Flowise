-- CreateTable
CREATE TABLE "ContextField" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "helpText" TEXT,
    "fieldType" TEXT,
    "fieldTextValue" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,

    CONSTRAINT "ContextField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sidekick" (
    "id" TEXT NOT NULL,
    "isGlobal" BOOLEAN DEFAULT false,
    "isSharedWithOrg" BOOLEAN DEFAULT false,
    "isFavoriteByDefault" BOOLEAN DEFAULT false,
    "tags" TEXT[],
    "label" TEXT NOT NULL,
    "placeholder" TEXT,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "frequency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "presence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxCompletionTokens" INTEGER NOT NULL DEFAULT 500,
    "aiModel" TEXT NOT NULL,
    "systemPromptTemplate" TEXT,
    "userPromptTemplate" TEXT,
    "contextStringRender" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Sidekick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SidekickFavoritedBy" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_SidekickFavoritedBy_AB_unique" ON "_SidekickFavoritedBy"("A", "B");

-- CreateIndex
CREATE INDEX "_SidekickFavoritedBy_B_index" ON "_SidekickFavoritedBy"("B");

-- AddForeignKey
ALTER TABLE "ContextField" ADD CONSTRAINT "ContextField_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContextField" ADD CONSTRAINT "ContextField_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sidekick" ADD CONSTRAINT "Sidekick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SidekickFavoritedBy" ADD CONSTRAINT "_SidekickFavoritedBy_A_fkey" FOREIGN KEY ("A") REFERENCES "Sidekick"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SidekickFavoritedBy" ADD CONSTRAINT "_SidekickFavoritedBy_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
