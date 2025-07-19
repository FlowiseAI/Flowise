import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddOrganizationToCustomTemplate1752612517000 implements MigrationInterface {
    name = 'AddOrganizationToCustomTemplate1752612517000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add new columns
        await queryRunner.query(`ALTER TABLE "custom_template" ADD "userId" uuid`)
        await queryRunner.query(`ALTER TABLE "custom_template" ADD "organizationId" uuid`)
        await queryRunner.query(`ALTER TABLE "custom_template" ADD "shareWithOrg" boolean NOT NULL DEFAULT false`)
        await queryRunner.query(`ALTER TABLE "custom_template" ADD "deletedDate" TIMESTAMP`)

        // Create indexes for performance
        await queryRunner.query(`CREATE INDEX "IDX_custom_template_userId" ON "custom_template" ("userId")`)
        await queryRunner.query(`CREATE INDEX "IDX_custom_template_organizationId" ON "custom_template" ("organizationId")`)

        // Check if chatflowId column exists in custom_template
        const chatflowIdExists = await queryRunner.hasColumn('custom_template', 'chatflowId')

        if (chatflowIdExists) {
            // 1. Migrate templates that have a valid chatflow (preserves real ownership)
            await queryRunner.query(`
                UPDATE custom_template ct
                SET 
                    "userId" = cf."userId",
                    "organizationId" = cf."organizationId", 
                    "shareWithOrg" = false
                FROM chat_flow cf
                WHERE cf.id = ct."chatflowId"::uuid
                  AND ct."userId" IS NULL
                  AND cf."userId" IS NOT NULL
            `)
        }

        // 2. Templates without a valid chatflow (tools, orphans) -> mark as system templates
        // Only migrate if organizations exist, otherwise leave as NULL (system templates)
        const organizationCount = await queryRunner.query(`SELECT COUNT(*) as count FROM organization`)
        if (organizationCount[0].count > 0) {
            await queryRunner.query(`
                UPDATE custom_template 
                SET 
                    "userId" = NULL,
                    "organizationId" = (SELECT id FROM organization ORDER BY "createdDate" ASC LIMIT 1),
                    "shareWithOrg" = true
                WHERE "userId" IS NULL
            `)
        } else {
            // If no organizations exist, leave these templates as system-wide (organizationId = NULL)
            await queryRunner.query(`
                UPDATE custom_template 
                SET 
                    "userId" = NULL,
                    "organizationId" = NULL,
                    "shareWithOrg" = false
                WHERE "userId" IS NULL
            `)
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert changes
        await queryRunner.query(`DROP INDEX "IDX_custom_template_organizationId"`)
        await queryRunner.query(`DROP INDEX "IDX_custom_template_userId"`)
        await queryRunner.query(`ALTER TABLE "custom_template" DROP COLUMN "deletedDate"`)
        await queryRunner.query(`ALTER TABLE "custom_template" DROP COLUMN "shareWithOrg"`)
        await queryRunner.query(`ALTER TABLE "custom_template" DROP COLUMN "organizationId"`)
        await queryRunner.query(`ALTER TABLE "custom_template" DROP COLUMN "userId"`)
    }
}
