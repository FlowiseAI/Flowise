import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddPlans1722954481004 implements MigrationInterface {
    name = 'AddPlans1722954481004'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "paid_plan" (
                "id" uuid NOT NULL,
                "organizationId" uuid NOT NULL,
                "amount" double precision NOT NULL,
                "currency" character varying NOT NULL,
                "availableExecutions" integer NOT NULL DEFAULT 0,
                "usedExecutions" integer NOT NULL DEFAULT 0,
                "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
                PRIMARY KEY ("id")
            )
        `)

        await queryRunner.query(`
            CREATE TABLE "trial_plan" (
                "id" uuid NOT NULL,
                "userId" uuid NOT NULL,
                "availableExecutions" integer NOT NULL DEFAULT 0,
                "usedExecutions" integer NOT NULL DEFAULT 0,
                "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
                PRIMARY KEY ("id")
            )
        `)

        await queryRunner.query(`
            CREATE INDEX "IDX_paid_plan_organizationId" ON "paid_plan" ("organizationId")
        `)
        await queryRunner.query(`
            CREATE INDEX "IDX_trial_plan_userId" ON "trial_plan" ("userId")
        `)

        await queryRunner.query(`
            ALTER TABLE "user"
            ADD COLUMN "trialPlanId" uuid NULL
        `)

        await queryRunner.query(`
            ALTER TABLE "organization"
            ADD COLUMN "currentPaidPlanId" uuid NULL
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_trial_plan_userId"`)
        await queryRunner.query(`DROP TABLE "trial_plan"`)

        await queryRunner.query(`DROP INDEX "IDX_paid_plan_organizationId"`)
        await queryRunner.query(`DROP TABLE "paid_plan"`)

        await queryRunner.query(`
            ALTER TABLE "organization"
            DROP COLUMN "currentPaidPlanId"
        `)

        await queryRunner.query(`
            ALTER TABLE "user"
            DROP COLUMN "trialPlanId"
        `)
    }
}
