-- AlterTable
ALTER TABLE "ActiveUserPlan" ADD COLUMN     "stripeSubscriptionId" TEXT;

-- AlterTable
ALTER TABLE "UserPlanHistory" ADD COLUMN     "stripeSubscriptionId" TEXT;
