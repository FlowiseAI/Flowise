/*
  Warnings:

  - The primary key for the `ActiveUserPlan` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `UserPlanHistory` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "ActiveUserPlan" DROP CONSTRAINT "ActiveUserPlan_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "ActiveUserPlan_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "ActiveUserPlan_id_seq";

-- AlterTable
ALTER TABLE "UserPlanHistory" DROP CONSTRAINT "UserPlanHistory_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "UserPlanHistory_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "UserPlanHistory_id_seq";
