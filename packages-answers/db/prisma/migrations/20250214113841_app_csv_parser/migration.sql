-- CreateEnum
CREATE TYPE "AppCsvParseRunstatus" AS ENUM ('pending', 'inProgress', 'completeWithErrors', 'complete', 'ready', 'generatingCsv');

-- CreateEnum
CREATE TYPE "AppCsvParseRowStatus" AS ENUM ('pending', 'inProgress', 'completeWithError', 'complete');

-- CreateTable
CREATE TABLE "AppCsvParseRuns" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "rowsRequested" INTEGER NOT NULL,
    "rowsProcessed" INTEGER,
    "name" TEXT NOT NULL,
    "configuration" JSONB NOT NULL,
    "originalCsvUrl" TEXT NOT NULL,
    "processedCsvUrl" TEXT,
    "chatflowChatId" TEXT NOT NULL,
    "status" "AppCsvParseRunstatus" NOT NULL DEFAULT 'pending',
    "errorMessages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "includeOriginalColumns" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AppCsvParseRuns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppCsvParseRows" (
    "id" TEXT NOT NULL,
    "csvParseRunId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rowData" JSONB NOT NULL,
    "generatedData" JSONB,
    "status" "AppCsvParseRowStatus" NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppCsvParseRows_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AppCsvParseRuns" ADD CONSTRAINT "AppCsvParseRuns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppCsvParseRuns" ADD CONSTRAINT "AppCsvParseRuns_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppCsvParseRows" ADD CONSTRAINT "AppCsvParseRows_csvParseRunId_fkey" FOREIGN KEY ("csvParseRunId") REFERENCES "AppCsvParseRuns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
