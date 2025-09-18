import { MigrationInterface, QueryRunner } from 'typeorm'

export class ModifyChatFlow1693920824108 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "temp_chat_flow" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "flowData" text NOT NULL, "deployed" boolean, "isPublic" boolean, "apikeyid" varchar, "chatbotConfig" text, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "updatedDate" datetime NOT NULL DEFAULT (datetime('now')));`
        )
        await queryRunner.query(
            `INSERT INTO "temp_chat_flow" ("id", "name", "flowData", "deployed", "isPublic", "apikeyid", "chatbotConfig", "createdDate", "updatedDate") SELECT "id", "name", "flowData", "deployed", "isPublic", "apikeyid", "chatbotConfig", "createdDate", "updatedDate" FROM "chat_flow";`
        )
        await queryRunner.query(`DROP TABLE chat_flow;`)
        await queryRunner.query(`ALTER TABLE temp_chat_flow RENAME TO chat_flow;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE temp_chat_flow`)
    }
}
