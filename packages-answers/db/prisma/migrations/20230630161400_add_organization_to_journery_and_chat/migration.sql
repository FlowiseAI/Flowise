-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Journey" ADD COLUMN     "organizationId" TEXT;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Journey" ADD CONSTRAINT "Journey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
