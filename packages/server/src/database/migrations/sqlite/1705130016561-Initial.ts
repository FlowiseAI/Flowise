import { MigrationInterface, QueryRunner } from "typeorm";

export class Initial1705130016561 implements MigrationInterface {
    name = 'Initial1705130016561'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user" ("id" varchar PRIMARY KEY NOT NULL, "username" text NOT NULL, "firstName" varchar NOT NULL, "password" varchar NOT NULL, "email" varchar, "lastName" varchar, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "updatedDate" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE TABLE "temporary_chat_flow" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "flowData" text NOT NULL, "deployed" boolean, "isPublic" boolean, "apikeyid" varchar, "chatbotConfig" text, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "updatedDate" datetime NOT NULL DEFAULT (datetime('now')), "apiConfig" text, "analytic" text, "category" text, "userId" varchar NOT NULL)`);
        await queryRunner.query(`INSERT INTO "temporary_chat_flow"("id", "name", "flowData", "deployed", "isPublic", "apikeyid", "chatbotConfig", "createdDate", "updatedDate", "apiConfig", "analytic", "category") SELECT "id", "name", "flowData", "deployed", "isPublic", "apikeyid", "chatbotConfig", "createdDate", "updatedDate", "apiConfig", "analytic", "category" FROM "chat_flow"`);
        await queryRunner.query(`DROP TABLE "chat_flow"`);
        await queryRunner.query(`ALTER TABLE "temporary_chat_flow" RENAME TO "chat_flow"`);
        await queryRunner.query(`DROP INDEX "IDX_e574527322272fd838f4f0f3d3"`);
        await queryRunner.query(`CREATE TABLE "temporary_chat_message" ("id" varchar PRIMARY KEY NOT NULL, "role" varchar NOT NULL, "chatflowid" varchar NOT NULL, "content" text NOT NULL, "sourceDocuments" text, "usedTools" text, "fileAnnotations" text, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "chatType" varchar NOT NULL, "chatId" varchar NOT NULL, "memoryType" varchar, "sessionId" varchar)`);
        await queryRunner.query(`INSERT INTO "temporary_chat_message"("id", "role", "chatflowid", "content", "sourceDocuments", "usedTools", "fileAnnotations", "createdDate", "chatType", "chatId", "memoryType", "sessionId") SELECT "id", "role", "chatflowid", "content", "sourceDocuments", "usedTools", "fileAnnotations", "createdDate", "chatType", "chatId", "memoryType", "sessionId" FROM "chat_message"`);
        await queryRunner.query(`DROP TABLE "chat_message"`);
        await queryRunner.query(`ALTER TABLE "temporary_chat_message" RENAME TO "chat_message"`);
        await queryRunner.query(`CREATE INDEX "IDX_e574527322272fd838f4f0f3d3" ON "chat_message" ("chatflowid") `);
        await queryRunner.query(`CREATE TABLE "temporary_variable" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "value" text, "type" text NOT NULL DEFAULT ('string'), "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "updatedDate" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`INSERT INTO "temporary_variable"("id", "name", "value", "type", "createdDate", "updatedDate") SELECT "id", "name", "value", "type", "createdDate", "updatedDate" FROM "variable"`);
        await queryRunner.query(`DROP TABLE "variable"`);
        await queryRunner.query(`ALTER TABLE "temporary_variable" RENAME TO "variable"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "variable" RENAME TO "temporary_variable"`);
        await queryRunner.query(`CREATE TABLE "variable" ("id" varchar PRIMARY KEY NOT NULL, "name" text NOT NULL, "value" text NOT NULL, "type" varchar, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "updatedDate" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`INSERT INTO "variable"("id", "name", "value", "type", "createdDate", "updatedDate") SELECT "id", "name", "value", "type", "createdDate", "updatedDate" FROM "temporary_variable"`);
        await queryRunner.query(`DROP TABLE "temporary_variable"`);
        await queryRunner.query(`DROP INDEX "IDX_e574527322272fd838f4f0f3d3"`);
        await queryRunner.query(`ALTER TABLE "chat_message" RENAME TO "temporary_chat_message"`);
        await queryRunner.query(`CREATE TABLE "chat_message" ("id" varchar PRIMARY KEY NOT NULL, "role" varchar NOT NULL, "chatflowid" varchar NOT NULL, "content" text NOT NULL, "sourceDocuments" text, "usedTools" text, "fileAnnotations" text, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "chatType" varchar NOT NULL DEFAULT ('INTERNAL'), "chatId" varchar NOT NULL, "memoryType" varchar, "sessionId" varchar)`);
        await queryRunner.query(`INSERT INTO "chat_message"("id", "role", "chatflowid", "content", "sourceDocuments", "usedTools", "fileAnnotations", "createdDate", "chatType", "chatId", "memoryType", "sessionId") SELECT "id", "role", "chatflowid", "content", "sourceDocuments", "usedTools", "fileAnnotations", "createdDate", "chatType", "chatId", "memoryType", "sessionId" FROM "temporary_chat_message"`);
        await queryRunner.query(`DROP TABLE "temporary_chat_message"`);
        await queryRunner.query(`CREATE INDEX "IDX_e574527322272fd838f4f0f3d3" ON "chat_message" ("chatflowid") `);
        await queryRunner.query(`ALTER TABLE "chat_flow" RENAME TO "temporary_chat_flow"`);
        await queryRunner.query(`CREATE TABLE "chat_flow" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "flowData" text NOT NULL, "deployed" boolean, "isPublic" boolean, "apikeyid" varchar, "chatbotConfig" text, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "updatedDate" datetime NOT NULL DEFAULT (datetime('now')), "apiConfig" text, "analytic" text, "category" text)`);
        await queryRunner.query(`INSERT INTO "chat_flow"("id", "name", "flowData", "deployed", "isPublic", "apikeyid", "chatbotConfig", "createdDate", "updatedDate", "apiConfig", "analytic", "category") SELECT "id", "name", "flowData", "deployed", "isPublic", "apikeyid", "chatbotConfig", "createdDate", "updatedDate", "apiConfig", "analytic", "category" FROM "temporary_chat_flow"`);
        await queryRunner.query(`DROP TABLE "temporary_chat_flow"`);
        await queryRunner.query(`DROP TABLE "user"`);
    }

}
