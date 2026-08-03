import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCustomMcpServer1766000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS custom_mcp_server (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" varchar NOT NULL,
                "serverUrl" text NOT NULL,
                "iconSrc" varchar,
                "color" varchar,
                "authType" varchar NOT NULL DEFAULT 'NONE',
                "authConfig" text,
                "tools" text,
                "toolCount" integer NOT NULL DEFAULT 0,
                "status" varchar NOT NULL DEFAULT 'PENDING',
                "createdDate" timestamp NOT NULL DEFAULT now(),
                "updatedDate" timestamp NOT NULL DEFAULT now(),
                "workspaceId" text NOT NULL,
                CONSTRAINT "PK_custom_mcp_server_id" PRIMARY KEY (id)
            );`
        )
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_custom_mcp_workspace_updated" ON custom_mcp_server ("workspaceId", "updatedDate");`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_custom_mcp_workspace_updated"`)
        await queryRunner.query(`DROP TABLE IF EXISTS custom_mcp_server`)
    }
}
