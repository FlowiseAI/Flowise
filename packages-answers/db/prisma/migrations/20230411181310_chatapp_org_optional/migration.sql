/*
  Warnings:

  - The primary key for the `ChatApp` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `appSettings` on the `ChatApp` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `ChatApp` table. All the data in the column will be lost.
  - The `id` column on the `ChatApp` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropIndex
DROP INDEX "ChatApp_email_key";

-- AlterTable
ALTER TABLE "ChatApp" DROP CONSTRAINT "ChatApp_pkey",
DROP COLUMN "appSettings",
DROP COLUMN "email",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "ChatApp_pkey" PRIMARY KEY ("id");
