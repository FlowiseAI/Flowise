import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddChatFlowVersioning1770000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create chat_flow_master table
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS \`chat_flow_master\` (
                \`id\` varchar(36) NOT NULL,
                \`name\` varchar(255) NOT NULL,
                \`type\` varchar(20) DEFAULT 'CHATFLOW',
                \`workspaceId\` text NOT NULL,
                \`category\` text NULL,
                \`isPublic\` tinyint DEFAULT NULL,
                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                KEY \`IDX_chat_flow_master_name\` (\`name\`),
                KEY \`IDX_chat_flow_master_workspace\` (\`workspaceId\`(255))
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
        )

        // Create chat_flow_version table
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS \`chat_flow_version\` (
                \`id\` varchar(36) NOT NULL,
                \`masterId\` varchar(36) NOT NULL,
                \`version\` int NOT NULL,
                \`isActive\` tinyint NOT NULL DEFAULT 0,
                \`flowData\` text NOT NULL,
                \`apikeyid\` varchar(255) DEFAULT NULL,
                \`chatbotConfig\` text NULL,
                \`apiConfig\` text NULL,
                \`analytic\` text NULL,
                \`speechToText\` text NULL,
                \`textToSpeech\` text NULL,
                \`followUpPrompts\` text NULL,
                \`changeDescription\` text NULL,
                \`sourceVersion\` int NULL,
                \`createdBy\` varchar(255) NULL,
                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                KEY \`IDX_chat_flow_version_master\` (\`masterId\`),
                UNIQUE KEY \`IDX_chat_flow_version_master_version\` (\`masterId\`, \`version\`),
                CONSTRAINT \`FK_chat_flow_version_master\` FOREIGN KEY (\`masterId\`)
                    REFERENCES \`chat_flow_master\` (\`id\`) ON DELETE CASCADE,
                CONSTRAINT \`CHK_version_positive\` CHECK (\`version\` > 0)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
        )

        // Note: MariaDB doesn't support partial unique indexes directly like PostgreSQL
        // The application layer will need to ensure only one active version per master
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS \`chat_flow_version\`;`)
        await queryRunner.query(`DROP TABLE IF EXISTS \`chat_flow_master\`;`)
    }
}
