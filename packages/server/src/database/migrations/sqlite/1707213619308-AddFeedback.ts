import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddFeedback1707213619308 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "chat_message_feedback" ("id" varchar PRIMARY KEY NOT NULL, "chatflowid" varchar NOT NULL, "content" text, "chatId" varchar NOT NULL, "messageId" varchar NOT NULL, "rating" varchar NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')));`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "chat_message_feedback";`)
    }
}
