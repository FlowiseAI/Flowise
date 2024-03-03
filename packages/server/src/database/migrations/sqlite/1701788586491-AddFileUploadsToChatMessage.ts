import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddFileUploadsToChatMessage1701788586491 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "temp_chat_message" ("id" varchar PRIMARY KEY NOT NULL, "role" varchar NOT NULL, "chatflowid" varchar NOT NULL, "content" text NOT NULL, "sourceDocuments" text, "usedTools" text, "fileAnnotations" text, "fileUploads" text, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "chatType" VARCHAR NOT NULL DEFAULT 'INTERNAL', "chatId" VARCHAR NOT NULL, "memoryType" VARCHAR, "sessionId" VARCHAR);`
        )
        await queryRunner.query(
            `INSERT INTO "temp_chat_message" ("id", "role", "chatflowid", "content", "sourceDocuments", "fileAnnotations", "usedTools", "createdDate", "chatType", "chatId", "memoryType", "sessionId") SELECT "id", "role", "chatflowid", "content", "sourceDocuments", "usedTools", "fileAnnotations", "createdDate", "chatType", "chatId", "memoryType", "sessionId" FROM "chat_message";`
        )
        await queryRunner.query(`DROP TABLE "chat_message";`)
        await queryRunner.query(`ALTER TABLE "temp_chat_message" RENAME TO "chat_message";`)
        await queryRunner.query(`CREATE INDEX "IDX_e574527322272fd838f4f0f3d3" ON "chat_message" ("chatflowid") ;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "temp_chat_message";`)
        await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "fileUploads";`)
    }
}
