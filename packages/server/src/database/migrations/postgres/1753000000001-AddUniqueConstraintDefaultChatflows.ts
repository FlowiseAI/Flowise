import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUniqueConstraintDefaultChatflows1753000000001 implements MigrationInterface {
    name = 'AddUniqueConstraintDefaultChatflows1753000000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // NOTE: Before running this migration, you should manually clean up duplicate chatflows
        // using the SQL scripts provided:
        // 1. Run 1-analyze-duplicate-chatflows.sql to see duplicates
        // 2. Run 2-generate-cleanup-statements.sql to get DELETE statements
        // 3. Manually execute the DELETE statements after reviewing them
        // 4. Then run this migration to add the unique constraint

        // Check if there are any remaining duplicates before adding the constraint
        const duplicateCheck = await queryRunner.query(`
            SELECT COUNT(*) as duplicate_count
            FROM (
                SELECT "userId", "parentChatflowId"
                FROM "chat_flow"
                WHERE "parentChatflowId" IS NOT NULL 
                  AND "deletedDate" IS NULL
                GROUP BY "userId", "parentChatflowId"
                HAVING COUNT(*) > 1
            ) duplicates
        `)

        const duplicateCount = parseInt(duplicateCheck[0]?.duplicate_count || '0')

        if (duplicateCount > 0) {
            throw new Error(
                `Cannot add unique constraint: ${duplicateCount} duplicate chatflow groups still exist. ` +
                    `Please run the manual cleanup scripts first:\n` +
                    `1. 1-analyze-duplicate-chatflows.sql\n` +
                    `2. 2-generate-cleanup-statements.sql\n` +
                    `3. Manually execute the DELETE statements\n` +
                    `4. Then re-run this migration`
            )
        }

        // Add the unique constraint
        // This prevents multiple default chatflows from the same template for the same user
        await queryRunner.query(`
            CREATE UNIQUE INDEX "idx_unique_user_parent_chatflow" 
            ON "chat_flow" ("userId", "parentChatflowId") 
            WHERE "parentChatflowId" IS NOT NULL AND "deletedDate" IS NULL
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the unique constraint
        // NOTE: If rolling back due to production issues with duplicate chatflows:
        // 1. First run the duplicate cleanup queries from dbeaver-detailed-analysis.sql
        // 2. Then roll back this migration
        // 3. Investigate root cause before re-applying
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_unique_user_parent_chatflow"`)
    }
}
