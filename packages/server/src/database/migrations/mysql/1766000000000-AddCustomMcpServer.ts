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
                \`toolCount\` int NOT NULL DEFAULT 0,
                \`status\` varchar(255) NOT NULL DEFAULT 'PENDING',
                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`workspaceId\` varchar(36) NOT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`
        )
        await queryRunner.query(
            `CREATE INDEX \`IDX_custom_mcp_workspace_updated\` ON \`custom_mcp_server\` (\`workspaceId\`, \`updatedDate\`);`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_custom_mcp_workspace_updated\` ON \`custom_mcp_server\``)
        await queryRunner.query(`DROP TABLE IF EXISTS \`custom_mcp_server\``)
    }
}
