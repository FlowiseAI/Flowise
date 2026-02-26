import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddChatFlowVersioning1770000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create chat_flow_master table
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "chat_flow_master" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar NOT NULL,
                "type" varchar(20) DEFAULT 'CHATFLOW',
                "workspaceId" text NOT NULL,
                "category" text,
                "isPublic" boolean,
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now'))
            );`
        )

        // Create indexes on chat_flow_master
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_chat_flow_master_name" ON "chat_flow_master" ("name");`)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_chat_flow_master_workspace" ON "chat_flow_master" ("workspaceId");`)

        // Create chat_flow_version table
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "chat_flow_version" (
                "id" varchar PRIMARY KEY NOT NULL,
                "masterId" varchar NOT NULL,
                "version" integer NOT NULL,
                "isActive" boolean NOT NULL DEFAULT 0,
                "flowData" text NOT NULL,
                "apikeyid" varchar,
                "chatbotConfig" text,
                "apiConfig" text,
                "analytic" text,
                "speechToText" text,
                "textToSpeech" text,
                "followUpPrompts" text,
                "changeDescription" text,
                "sourceVersion" integer,
                "createdBy" varchar,
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY ("masterId") REFERENCES "chat_flow_master" ("id") ON DELETE CASCADE,
                CHECK ("version" > 0)
            );`
        )

        // Create indexes on chat_flow_version
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_chat_flow_version_master" ON "chat_flow_version" ("masterId");`)
        await queryRunner.query(
            `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_chat_flow_version_master_version" ON "chat_flow_version" ("masterId", "version");`
        )

        // Create partial unique index for active version (SQLite 3.8.0+)
        await queryRunner.query(
            `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_chat_flow_version_active" ON "chat_flow_version" ("masterId") WHERE "isActive" = 1;`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_flow_version_active";`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_flow_version_master_version";`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_flow_version_master";`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_flow_master_workspace";`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_flow_master_name";`)
        await queryRunner.query(`DROP TABLE IF EXISTS "chat_flow_version";`)
        await queryRunner.query(`DROP TABLE IF EXISTS "chat_flow_master";`)
    }
}
