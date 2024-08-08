-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "appSettings" JSONB NOT NULL,
    "image" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" SERIAL NOT NULL,
    "jiraSettingsId" INTEGER NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppService" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "appSettingsId" INTEGER,

    CONSTRAINT "AppService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JiraSettings" (
    "id" SERIAL NOT NULL,

    CONSTRAINT "JiraSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JiraProjectSetting" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "jiraSettingsId" INTEGER,

    CONSTRAINT "JiraProjectSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "AppSettings" ADD CONSTRAINT "AppSettings_jiraSettingsId_fkey" FOREIGN KEY ("jiraSettingsId") REFERENCES "JiraSettings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppService" ADD CONSTRAINT "AppService_appSettingsId_fkey" FOREIGN KEY ("appSettingsId") REFERENCES "AppSettings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JiraProjectSetting" ADD CONSTRAINT "JiraProjectSetting_jiraSettingsId_fkey" FOREIGN KEY ("jiraSettingsId") REFERENCES "JiraSettings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
