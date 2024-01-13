import { MigrationInterface, QueryRunner } from "typeorm";

export class Initial1705143200388 implements MigrationInterface {
    name = 'Initial1705143200388'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "chat_flow" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "name" character varying NOT NULL, "flowData" text NOT NULL, "deployed" boolean, "isPublic" boolean, "apikeyid" character varying, "chatbotConfig" text, "apiConfig" text, "analytic" text, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "category" text, CONSTRAINT "PK_3c7cea7d047ac4b91764574cdbf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "chat_message" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "role" character varying NOT NULL, "chatflowid" character varying NOT NULL, "content" text NOT NULL, "sourceDocuments" text, "usedTools" text, "fileAnnotations" text, "chatType" character varying NOT NULL, "chatId" character varying NOT NULL, "memoryType" character varying, "sessionId" character varying, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3cc0d85193aade457d3077dd06b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e574527322272fd838f4f0f3d3" ON "chat_message" ("chatflowid") `);
        await queryRunner.query(`CREATE TABLE "credential" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "credentialName" character varying NOT NULL, "encryptedData" text NOT NULL, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3a5169bcd3d5463cefeec78be82" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "tool" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" text NOT NULL, "color" character varying NOT NULL, "iconSrc" character varying, "schema" text, "func" text, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3bf5b1016a384916073184f99b7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "assistant" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "details" text NOT NULL, "credential" character varying NOT NULL, "iconSrc" character varying, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_eb7d5dbc702c098df659e65c606" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "variable" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "value" text, "type" text NOT NULL DEFAULT 'string', "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f4e200785984484787e6b47e6fb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" text NOT NULL, "firstName" character varying NOT NULL, "password" character varying NOT NULL, "email" character varying, "lastName" character varying, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "variable"`);
        await queryRunner.query(`DROP TABLE "assistant"`);
        await queryRunner.query(`DROP TABLE "tool"`);
        await queryRunner.query(`DROP TABLE "credential"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e574527322272fd838f4f0f3d3"`);
        await queryRunner.query(`DROP TABLE "chat_message"`);
        await queryRunner.query(`DROP TABLE "chat_flow"`);
    }

}
