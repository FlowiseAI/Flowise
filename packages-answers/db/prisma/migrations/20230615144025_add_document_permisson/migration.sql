-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "content" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "currentOrganizationId" TEXT;

-- CreateTable
CREATE TABLE "DocumentPermission" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_UserOrganzations" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_UserOrganzations_AB_unique" ON "_UserOrganzations"("A", "B");

-- CreateIndex
CREATE INDEX "_UserOrganzations_B_index" ON "_UserOrganzations"("B");

-- AddForeignKey
ALTER TABLE "DocumentPermission" ADD CONSTRAINT "DocumentPermission_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentPermission" ADD CONSTRAINT "DocumentPermission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserOrganzations" ADD CONSTRAINT "_UserOrganzations_A_fkey" FOREIGN KEY ("A") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserOrganzations" ADD CONSTRAINT "_UserOrganzations_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
