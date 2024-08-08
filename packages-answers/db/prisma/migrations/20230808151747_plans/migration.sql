-- CreateTable
CREATE TABLE "Plan" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tokenLimit" INTEGER NOT NULL,
    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- Seed Data
INSERT INTO
    "Plan" ("id", "name", "tokenLimit", "description")
VALUES
    (
        1,
        'Free',
        160000,
        'The Free Plan is the perfect option for users who want to dip their toes into the world of AnswerAI. With this plan, users can experience the power of our platform at no cost. You''ll have access to 160,000 gpt3 tokens (16,000 gpt4 tokens), allowing you to chat with the web, upload documents and transcripts, and access open-source code repositories using our innovative D.A.I.S.Y. package. We believe in the democratization of AI, and this free plan is our way of enabling users to explore and utilize our powerful tools without any financial commitment.'
    ),
    (
        2,
        'Paid',
        3000000,
        'The Paid Plan is where the true value of AnswerAI shines. This plan is the bread and butter of our pricing structure, specifically designed to cater to the needs of individuals and small teams. For a reasonable price, you''ll get access to 3,000,000 gpt3 tokens (300,000 gpt4 tokens), unlocking an incredible AI-driven experience. With the Paid Plan, you can connect your data sources and automatically add them to your knowledge base, making your workflow more efficient and your decision-making more informed. Say goodbye to endless copy-pasting and welcome a streamlined development process that saves you time and enhances the quality of your work.'
    ),
    (
        3,
        'Pro',
        6000000,
        'The Pro Plan is the ultimate choice for professionals who are ready to maximize their potential with AnswerAI. With this plan, you''ll have access to 6,000,000 gpt3 tokens (600,000 gpt4 tokens). This substantial increase in token usage allows you to supercharge your AI-driven projects and take them to the next level. Whether you''re a data scientist, project manager, or automation expert, the Pro Plan offers the tools and resources you need to unlock your full potential and achieve remarkable results. It''s time to harness the true power of generative AI and reshape the way you work.'
    );

-- CreateTable
CREATE TABLE "UserPlanHistory" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" INTEGER NOT NULL,
    "renewalDate" TIMESTAMP(3) NOT NULL,
    "tokensLeft" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "gpt3RequestCount" INTEGER NOT NULL,
    "gpt4RequestCount" INTEGER NOT NULL,
    CONSTRAINT "UserPlanHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActiveUserPlan" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" INTEGER NOT NULL,
    "renewalDate" TIMESTAMP(3) NOT NULL,
    "tokensLeft" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gpt3RequestCount" INTEGER NOT NULL DEFAULT 0,
    "gpt4RequestCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ActiveUserPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActiveUserPlan_userId_key" ON "ActiveUserPlan"("userId");

-- AddForeignKey
ALTER TABLE
    "UserPlanHistory"
ADD
    CONSTRAINT "UserPlanHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
    "UserPlanHistory"
ADD
    CONSTRAINT "UserPlanHistory_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
    "ActiveUserPlan"
ADD
    CONSTRAINT "ActiveUserPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
    "ActiveUserPlan"
ADD
    CONSTRAINT "ActiveUserPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;