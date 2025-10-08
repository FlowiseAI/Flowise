import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUniqueConstraintDefaultChatflows1753000000001 implements MigrationInterface {
    name = 'AddUniqueConstraintDefaultChatflows1753000000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Automatically clean up duplicate chatflows, keeping the most recently updated one

        // First, check if there are any duplicates
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
            console.log(`Found ${duplicateCount} duplicate chatflow groups. Cleaning up automatically...`)

            // Delete duplicate chatflows, keeping the best one for each group
            // Priority: 1) User's defaultChatflowId if set, 2) Most recently updated, 3) Highest id
            const deleteResult = await queryRunner.query(`
                DELETE FROM "chat_flow"
                WHERE id IN (
                    SELECT id FROM (
                        SELECT cf.id,
                               ROW_NUMBER() OVER (
                                   PARTITION BY cf."userId", cf."parentChatflowId"
                                   ORDER BY
                                       CASE WHEN u."defaultChatflowId"::text = cf.id::text THEN 0 ELSE 1 END,
                                       cf."updatedDate" DESC,
                                       cf.id DESC
                               ) as row_num
                        FROM "chat_flow" cf
                        LEFT JOIN "user" u ON u.id::text = cf."userId"::text
                        WHERE cf."parentChatflowId" IS NOT NULL
                          AND cf."deletedDate" IS NULL
                    ) ranked
                    WHERE row_num > 1
                )
            `)

            console.log(`Deleted ${deleteResult[1]} duplicate chatflow records`)
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
