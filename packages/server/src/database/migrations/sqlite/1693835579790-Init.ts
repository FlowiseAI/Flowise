import { MigrationInterface, QueryRunner } from 'typeorm'

export class Init1693835579790 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "chat_flow" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "flowData" text NOT NULL, "deployed" boolean, "isPublic" boolean, "apikeyid" varchar, "chatbotConfig" text, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "updatedDate" datetime NOT NULL DEFAULT (datetime('now')));`
        )
        await queryRunner.query(
            `CREATE TABLE "chat_message" ("id" varchar PRIMARY KEY NOT NULL, "role" varchar NOT NULL, "chatflowid" varchar NOT NULL, "content" text NOT NULL, "sourceDocuments" text, "createdDate" datetime NOT NULL DEFAULT (datetime('now')));`
        )
        await queryRunner.query(`CREATE INDEX "IDX_e574527322272fd838f4f0f3d3" ON "chat_message" ("chatflowid") ;`)
        await queryRunner.query(
            `CREATE TABLE "credential" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "credentialName" varchar NOT NULL, "encryptedData" text NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "updatedDate" datetime NOT NULL DEFAULT (datetime('now')));`
        )
        await queryRunner.query(
            `CREATE TABLE "tool" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "description" text NOT NULL, "color" varchar NOT NULL, "iconSrc" varchar, "schema" text, "func" text, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "updatedDate" datetime NOT NULL DEFAULT (datetime('now')));`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE chat_flow`)
        await queryRunner.query(`DROP TABLE chat_message`)
        await queryRunner.query(`DROP TABLE credential`)
        await queryRunner.query(`DROP TABLE tool`)
    }
}
