/*
  Warnings:

  - The primary key for the `AppService` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `AppSettings` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Chat` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `JiraProjectSetting` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `JiraSettings` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Message` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Prompt` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "AppService" DROP CONSTRAINT "AppService_appSettingsId_fkey";

-- DropForeignKey
ALTER TABLE "AppSettings" DROP CONSTRAINT "AppSettings_jiraSettingsId_fkey";

-- DropForeignKey
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_promptId_fkey";

-- DropForeignKey
ALTER TABLE "JiraProjectSetting" DROP CONSTRAINT "JiraProjectSetting_jiraSettingsId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_chatId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_promptId_fkey";

-- DropForeignKey
ALTER TABLE "_ChatToUser" DROP CONSTRAINT "_ChatToUser_A_fkey";

-- DropForeignKey
ALTER TABLE "_PromptToUser" DROP CONSTRAINT "_PromptToUser_A_fkey";

-- AlterTable
ALTER TABLE "AppService" DROP CONSTRAINT "AppService_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "appSettingsId" SET DATA TYPE TEXT,
ADD CONSTRAINT "AppService_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "AppService_id_seq";

-- AlterTable
ALTER TABLE "AppSettings" DROP CONSTRAINT "AppSettings_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "jiraSettingsId" SET DATA TYPE TEXT,
ADD CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "AppSettings_id_seq";

-- AlterTable
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "promptId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Chat_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Chat_id_seq";

-- AlterTable
ALTER TABLE "JiraProjectSetting" DROP CONSTRAINT "JiraProjectSetting_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "jiraSettingsId" SET DATA TYPE TEXT,
ADD CONSTRAINT "JiraProjectSetting_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "JiraProjectSetting_id_seq";

-- AlterTable
ALTER TABLE "JiraSettings" DROP CONSTRAINT "JiraSettings_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "JiraSettings_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "JiraSettings_id_seq";

-- AlterTable
ALTER TABLE "Message" DROP CONSTRAINT "Message_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "chatId" SET DATA TYPE TEXT,
ALTER COLUMN "promptId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Message_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Message_id_seq";

-- AlterTable
ALTER TABLE "Prompt" DROP CONSTRAINT "Prompt_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Prompt_id_seq";

-- AlterTable
ALTER TABLE "_ChatToUser" ALTER COLUMN "A" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "_PromptToUser" ALTER COLUMN "A" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSettings" ADD CONSTRAINT "AppSettings_jiraSettingsId_fkey" FOREIGN KEY ("jiraSettingsId") REFERENCES "JiraSettings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppService" ADD CONSTRAINT "AppService_appSettingsId_fkey" FOREIGN KEY ("appSettingsId") REFERENCES "AppSettings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JiraProjectSetting" ADD CONSTRAINT "JiraProjectSetting_jiraSettingsId_fkey" FOREIGN KEY ("jiraSettingsId") REFERENCES "JiraSettings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChatToUser" ADD CONSTRAINT "_ChatToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PromptToUser" ADD CONSTRAINT "_PromptToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
