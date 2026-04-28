import { MigrationInterface, QueryRunner } from 'typeorm'

export class ModifyChatMessage1693921865247 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "temp_chat_message" ("id" varchar PRIMARY KEY NOT NULL, "role" varchar NOT NULL, "chatflowid" varchar NOT NULL, "content" text NOT NULL, "sourceDocuments" text, "createdDate" datetime NOT NULL DEFAULT (datetime('now')));`
        )
        await queryRunner.query(
            `INSERT INTO "temp_chat_message" ("id", "role", "chatflowid", "content", "sourceDocuments", "createdDate") SELECT "id", "role", "chatflowid", "content", "sourceDocuments", "createdDate" FROM "chat_message";`
        )
        await queryRunner.query(`DROP TABLE chat_message;`)
        await queryRunner.query(`ALTER TABLE temp_chat_message RENAME TO chat_message;`)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_e574527322272fd838f4f0f3d3" ON "chat_message" ("chatflowid") ;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE temp_chat_message`)
    }
}
