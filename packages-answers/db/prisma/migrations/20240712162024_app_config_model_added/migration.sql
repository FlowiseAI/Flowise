-- CreateTable
CREATE TABLE "AppConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "appType" TEXT NOT NULL,
    "config" JSONB NOT NULL,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AppConfig" ADD CONSTRAINT "AppConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
