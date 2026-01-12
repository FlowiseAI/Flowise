import { MigrationInterface, QueryRunner } from 'typeorm'

export class MigrateChatFlowToVersioning1770000000001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Migrate existing chat_flow records to chat_flow_master
        await queryRunner.query(
            `INSERT OR IGNORE INTO "chat_flow_master" ("id", "name", "type", "workspaceId", "category", "isPublic", "createdDate", "updatedDate")
            SELECT
                "id",
                "name",
                COALESCE("type", 'CHATFLOW'),
                "workspaceId",
                "category",
                "isPublic",
                "createdDate",
                "updatedDate"
            FROM "chat_flow";`
        )

        // Create version 1 for each flow in chat_flow_version
        await queryRunner.query(
            `INSERT INTO "chat_flow_version" (
                "id",
                "masterId",
                "version",
                "isActive",
                "flowData",
                "apikeyid",
                "chatbotConfig",
                "apiConfig",
                "analytic",
                "speechToText",
                "textToSpeech",
                "followUpPrompts",
                "changeDescription",
                "sourceVersion",
                "createdBy",
                "createdDate",
                "updatedDate"
            )
            SELECT
                lower(hex(randomblob(16))),
                "id",
                1,
                1,
                "flowData",
                "apikeyid",
                "chatbotConfig",
                "apiConfig",
                "analytic",
                "speechToText",
                "textToSpeech",
                "followUpPrompts",
                'Migrated from legacy chat_flow',
                NULL,
                NULL,
                "createdDate",
                "updatedDate"
            FROM "chat_flow";`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove migrated data (keep original chat_flow table intact)
        await queryRunner.query(`DELETE FROM "chat_flow_version" WHERE "changeDescription" = 'Migrated from legacy chat_flow';`)
        await queryRunner.query(`DELETE FROM "chat_flow_master" WHERE "id" IN (SELECT "id" FROM "chat_flow");`)
    }
}
