import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddFeedback1707213626553 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS \`chat_message_feedback\` (
                \`id\` varchar(36) NOT NULL,
                \`chatflowid\` varchar(255) NOT NULL,
                \`content\` text,
                \`chatId\` varchar(255) NOT NULL,
                \`messageId\` varchar(255) NOT NULL,
                \`rating\` varchar(255) NOT NULL,
                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE chat_message_feedback`)
    }
}
