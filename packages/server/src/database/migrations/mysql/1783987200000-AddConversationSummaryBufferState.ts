import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddConversationSummaryBufferState1783987200000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`conversation_summary_buffer_state\` (
                \`stateKey\` varchar(64) NOT NULL,
                \`chatflowid\` varchar(36) NOT NULL,
                \`sessionId\` varchar(255) NOT NULL,
                \`nodeId\` varchar(255) NOT NULL,
                \`summary\` longtext NOT NULL,
                \`cursorCreatedDate\` datetime(6),
                \`cursorMessageId\` varchar(36),
                \`version\` int NOT NULL DEFAULT 1,
                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`stateKey\`),
                INDEX \`IDX_conversation_summary_buffer_state_session\` (\`chatflowid\`, \`sessionId\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE `conversation_summary_buffer_state`')
    }
}
