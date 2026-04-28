import { MigrationInterface, QueryRunner } from 'typeorm'
import { EnumChatflowType } from '../../entities/ChatFlow'

export class ModifyChatflowType1755066758601 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "temp_chat_flow" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "name" varchar NOT NULL, 
                "flowData" text NOT NULL, 
                "deployed" boolean, 
                "isPublic" boolean, 
                "apikeyid" varchar, 
                "chatbotConfig" text, 
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "apiConfig" TEXT, 
                "analytic" TEXT, 
                "category" TEXT, 
                "speechToText" TEXT, 
                "type" VARCHAR(20) NOT NULL DEFAULT '${EnumChatflowType.CHATFLOW}', 
                "workspaceId" TEXT, 
                "followUpPrompts" TEXT,
                FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id")
            );
        `)

        await queryRunner.query(`
            INSERT INTO "temp_chat_flow" ("id", "name", "flowData", "deployed", "isPublic", "apikeyid", "chatbotConfig", "createdDate", "updatedDate", "apiConfig", "analytic", "category", "speechToText", "type", "workspaceId", "followUpPrompts")
            SELECT "id", "name", "flowData", "deployed", "isPublic", "apikeyid", "chatbotConfig", "createdDate", "updatedDate", "apiConfig", "analytic", "category", "speechToText",
            CASE WHEN "type" IS NULL OR "type" = '' THEN '${EnumChatflowType.CHATFLOW}' ELSE "type" END, "workspaceId", "followUpPrompts" FROM "chat_flow";
        `)

        await queryRunner.query(`DROP TABLE "chat_flow";`)

        await queryRunner.query(`ALTER TABLE "temp_chat_flow" RENAME TO "chat_flow";`)
    }

    public async down(): Promise<void> {}
}
