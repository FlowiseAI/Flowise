import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddPlans1722954685054 implements MigrationInterface {
    name = 'AddPlans1722954685054'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`paid_plan\` (
                \`id\` varchar(36) NOT NULL,
                \`organizationId\` varchar(36) NOT NULL,
                \`amount\` float NOT NULL,
                \`currency\` varchar(255) NOT NULL,
                \`availableExecutions\` int NOT NULL DEFAULT 0,
                \`usedExecutions\` int NOT NULL DEFAULT 0,
                \`createdDate\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedDate\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `)

        await queryRunner.query(`
            CREATE TABLE \`trial_plan\` (
                \`id\` varchar(36) NOT NULL,
                \`userId\` varchar(36) NOT NULL,
                \`availableExecutions\` int NOT NULL DEFAULT 0,
                \`usedExecutions\` int NOT NULL DEFAULT 0,
                \`createdDate\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedDate\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `)

        await queryRunner.query(`
            CREATE INDEX \`IDX_paid_plan_organizationId\` ON \`paid_plan\` (\`organizationId\`)
        `)
        await queryRunner.query(`
            CREATE INDEX \`IDX_trial_plan_userId\` ON \`trial_plan\` (\`userId\`)
        `)

        await queryRunner.query(`
            ALTER TABLE \`user\`
            ADD COLUMN \`trialPlanId\` varchar(36) NULL
        `)

        await queryRunner.query(`
            ALTER TABLE \`organization\`
            ADD COLUMN \`currentPaidPlanId\` varchar(36) NULL
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_trial_plan_userId\` ON \`trial_plan\``)
        await queryRunner.query(`DROP TABLE \`trial_plan\``)

        await queryRunner.query(`DROP INDEX \`IDX_paid_plan_organizationId\` ON \`paid_plan\``)
        await queryRunner.query(`DROP TABLE \`paid_plan\``)

        await queryRunner.query(`
            ALTER TABLE \`organization\`
            DROP COLUMN \`currentPaidPlanId\`
        `)

        await queryRunner.query(`
            ALTER TABLE \`user\`
            DROP COLUMN \`trialPlanId\`
        `)
    }
}
