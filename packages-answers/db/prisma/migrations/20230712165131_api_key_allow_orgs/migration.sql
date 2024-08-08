-- CreateEnum
CREATE TYPE "ApiKeyType" AS ENUM ('USER', 'ORGANIZATION');

-- DropForeignKey
ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_userId_fkey";

-- DropIndex
DROP INDEX "ApiKey_userId_key";

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "type" "ApiKeyType" NOT NULL DEFAULT 'USER',
ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
