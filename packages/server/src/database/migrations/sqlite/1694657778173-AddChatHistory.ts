import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddChatHistory1694657778173 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_message" ADD COLUMN "chatId" VARCHAR;`)
        const results: { id: string; chatflowid: string }[] = await queryRunner.query(`WITH RankedMessages AS (
                SELECT
                    "chatflowid",
                    "id",
                    "createdDate",
                    ROW_NUMBER() OVER (PARTITION BY "chatflowid" ORDER BY "createdDate") AS row_num
                FROM "chat_message"
            )
            SELECT "chatflowid", "id"
            FROM RankedMessages
            WHERE row_num = 1;`)
        for (const chatMessage of results) {
            await queryRunner.query(
                `UPDATE "chat_message" SET "chatId" = '${chatMessage.id}' WHERE "chatflowid" = '${chatMessage.chatflowid}'`
            )
        }
        await queryRunner.query(
            `CREATE TABLE "temp_chat_message" ("id" varchar PRIMARY KEY NOT NULL, "role" varchar NOT NULL, "chatflowid" varchar NOT NULL, "content" text NOT NULL, "sourceDocuments" text, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "chatType" VARCHAR NOT NULL DEFAULT 'INTERNAL', "chatId" VARCHAR NOT NULL, "memoryType" VARCHAR, "sessionId" VARCHAR);`
        )
        await queryRunner.query(
            `INSERT INTO "temp_chat_message" ("id", "role", "chatflowid", "content", "sourceDocuments", "createdDate", "chatId") SELECT "id", "role", "chatflowid", "content", "sourceDocuments", "createdDate", "chatId" FROM "chat_message";`
        )
        await queryRunner.query(`DROP TABLE "chat_message";`)
        await queryRunner.query(`ALTER TABLE "temp_chat_message" RENAME TO "chat_message";`)
        await queryRunner.query(`CREATE INDEX "IDX_e574527322272fd838f4f0f3d3" ON "chat_message" ("chatflowid") ;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "temp_chat_message";`)
        await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "chatType";`)
        await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "chatId";`)
        await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "memoryType";`)
        await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "sessionId";`)
    }
}
