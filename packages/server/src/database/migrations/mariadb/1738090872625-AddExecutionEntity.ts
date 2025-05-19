import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddExecutionEntity1738090872625 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS \`execution\` (
                \`id\` varchar(36) NOT NULL,
                \`executionData\` text NOT NULL,
                \`action\` text,
                \`state\` varchar(255) NOT NULL,
                \`agentflowId\` varchar(255) NOT NULL,
                \`sessionId\` varchar(255) NOT NULL,
                \`isPublic\` boolean,
                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`stoppedDate\` datetime(6),
                PRIMARY KEY (\`id\`)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;`
        )

        const columnExists = await queryRunner.hasColumn('chat_message', 'executionId')
        if (!columnExists) {
            await queryRunner.query(`ALTER TABLE \`chat_message\` ADD COLUMN \`executionId\` TEXT;`)
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS \`execution\``)
        await queryRunner.query(`ALTER TABLE \`chat_message\` DROP COLUMN \`executionId\`;`)
    }
}
