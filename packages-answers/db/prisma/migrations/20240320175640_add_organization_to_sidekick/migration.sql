-- AlterTable
ALTER TABLE "Sidekick" ADD COLUMN     "organizationId" TEXT;

-- AddForeignKey
ALTER TABLE "Sidekick" ADD CONSTRAINT "Sidekick_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
