import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddFeedback1707213619308 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "chat_message_feedback" ("id" varchar PRIMARY KEY NOT NULL, "chatflowid" varchar NOT NULL, "chatId" varchar NOT NULL, "messageId" varchar NOT NULL, "rating" varchar NOT NULL, "content" text, "createdDate" datetime NOT NULL DEFAULT (datetime('now')));`
        )
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_e574527322272fd838f4f0f3d3" ON "chat_message_feedback" ("chatflowid") ;`)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_e574527322272fd838f4f0f3d3" ON "chat_message_feedback" ("chatId") ;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "chat_message_feedback";`)
    }
}
