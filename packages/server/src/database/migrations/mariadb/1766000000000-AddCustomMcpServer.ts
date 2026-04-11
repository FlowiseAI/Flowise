import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCustomMcpServer1766000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS \`custom_mcp_server\` (
                \`id\` varchar(36) NOT NULL,
                \`name\` varchar(255) NOT NULL,
                \`serverUrl\` text NOT NULL,
                \`iconSrc\` varchar(255),
                \`color\` varchar(255),
                \`authType\` varchar(255) NOT NULL DEFAULT 'NONE',
                \`authConfig\` text,
                \`tools\` text,
                \`status\` varchar(255) NOT NULL DEFAULT 'PENDING',
                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`workspaceId\` text NOT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS \`custom_mcp_server\``)
    }
}
