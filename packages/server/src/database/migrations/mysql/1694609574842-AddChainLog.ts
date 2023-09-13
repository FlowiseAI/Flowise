import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddChainLog1694609574842 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`chat_flow\` (
                \`id\` varchar(36) NOT NULL,
                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`question\` text NOT NULL,
                \`text\` text NOT NULL,
                \`chatId\` varchar(255) DEFAULT NULL,
                \`isInternal\` tinyint DEFAULT NULL,
                \`chatflowId\` varchar(255) DEFAULT NULL,
                \`chatflowName\` varchar(255) DEFAULT NULL,
                \`result\` text NOT NULL,
                PRIMARY KEY (\`id\`)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE chain_log`)
    }
}
