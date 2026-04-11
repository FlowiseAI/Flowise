import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCustomMcpServer1766000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "custom_mcp_server" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "serverUrl" text NOT NULL, "iconSrc" varchar, "color" varchar, "authType" varchar NOT NULL DEFAULT ('NONE'), "authConfig" text, "tools" text, "status" varchar NOT NULL DEFAULT ('PENDING'), "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "updatedDate" datetime NOT NULL DEFAULT (datetime('now')), "workspaceId" text NOT NULL);`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "custom_mcp_server"`)
    }
}
