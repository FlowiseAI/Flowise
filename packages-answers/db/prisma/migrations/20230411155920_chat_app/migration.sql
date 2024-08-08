-- CreateTable
CREATE TABLE "ChatApp" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT NOT NULL,
    "appSettings" JSONB,

    CONSTRAINT "ChatApp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatApp_email_key" ON "ChatApp"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ChatApp_apiKey_key" ON "ChatApp"("apiKey");

-- AddForeignKey
ALTER TABLE "ChatApp" ADD CONSTRAINT "ChatApp_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatApp" ADD CONSTRAINT "ChatApp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
