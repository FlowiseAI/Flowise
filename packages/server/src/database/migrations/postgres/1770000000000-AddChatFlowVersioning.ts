import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddChatFlowVersioning1770000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create chat_flow_master table
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS chat_flow_master (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" varchar NOT NULL,
                "type" varchar(20) DEFAULT 'CHATFLOW',
                "workspaceId" text NOT NULL,
                "category" text NULL,
                "isPublic" bool NULL,
                "createdDate" timestamp NOT NULL DEFAULT now(),
                "updatedDate" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_chat_flow_master" PRIMARY KEY (id)
            );`
        )

        // Create indexes on chat_flow_master
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_chat_flow_master_name" ON chat_flow_master USING btree ("name");`)
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_chat_flow_master_workspace" ON chat_flow_master USING btree ("workspaceId");`
        )

        // Create chat_flow_version table
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS chat_flow_version (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "masterId" uuid NOT NULL,
                "version" integer NOT NULL,
                "isActive" boolean NOT NULL DEFAULT false,
                "flowData" text NOT NULL,
                apikeyid varchar NULL,
                "chatbotConfig" text NULL,
                "apiConfig" text NULL,
                analytic text NULL,
                "speechToText" text NULL,
                "textToSpeech" text NULL,
                "followUpPrompts" text NULL,
                "changeDescription" text NULL,
                "sourceVersion" integer NULL,
                "createdBy" varchar NULL,
                "createdDate" timestamp NOT NULL DEFAULT now(),
                "updatedDate" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_chat_flow_version" PRIMARY KEY (id),
                CONSTRAINT "FK_chat_flow_version_master" FOREIGN KEY ("masterId")
                    REFERENCES chat_flow_master(id) ON DELETE CASCADE,
                CONSTRAINT "CHK_version_positive" CHECK ("version" > 0)
            );`
        )

        // Create indexes on chat_flow_version
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_chat_flow_version_master" ON chat_flow_version USING btree ("masterId");`)
        await queryRunner.query(
            `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_chat_flow_version_master_version" ON chat_flow_version ("masterId", "version");`
        )

        // Create partial unique index for active version (only one active version per master)
        await queryRunner.query(
            `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_chat_flow_version_active" ON chat_flow_version ("masterId") WHERE "isActive" = true;`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes first
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_flow_version_active";`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_flow_version_master_version";`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_flow_version_master";`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_flow_master_workspace";`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_flow_master_name";`)

        // Drop tables
        await queryRunner.query(`DROP TABLE IF EXISTS chat_flow_version;`)
        await queryRunner.query(`DROP TABLE IF EXISTS chat_flow_master;`)
    }
}
