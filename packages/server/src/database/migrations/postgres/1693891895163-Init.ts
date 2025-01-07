import { MigrationInterface, QueryRunner } from 'typeorm'

export class Init1693891895163 implements MigrationInterface {
  name = 'Init1693891895163'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
            CREATE TYPE "public"."users_role_enum" AS ENUM('STOCK', 'UNI', 'ADMIN');
        END IF;
    END $$;`)
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`)
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying(255) NOT NULL, "email" character varying(255), "role" "public"."users_role_enum" NOT NULL DEFAULT 'ADMIN', "displayPrefixes" character varying, "password" character varying(255) NOT NULL, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(`CREATE INDEX "IDX_fe0bb3f6520ee0469504521e71" ON "users" ("username") `)
    await queryRunner.query(`CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `)
    await queryRunner.query(
      `CREATE TABLE "chat_flow" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "flowData" text NOT NULL, "deployed" boolean, "isPublic" boolean, "apikeyid" character varying, "chatbotConfig" text, "apiConfig" text, "analytic" text, "speechToText" text, "followUpPrompts" text, "category" text, "type" text, "userId" uuid, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3c7cea7d047ac4b91764574cdbf" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(
      `CREATE TABLE "chat_message" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "role" character varying NOT NULL, "chatflowid" uuid NOT NULL, "content" text NOT NULL, "sourceDocuments" text, "usedTools" text, "fileAnnotations" text, "agentReasoning" text, "fileUploads" text, "artifacts" text, "action" text, "chatType" character varying NOT NULL, "chatId" character varying NOT NULL, "memoryType" character varying, "sessionId" character varying, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "leadEmail" text, "followUpPrompts" text, CONSTRAINT "PK_3cc0d85193aade457d3077dd06b" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(`CREATE INDEX "IDX_e574527322272fd838f4f0f3d3" ON "chat_message" ("chatflowid") `)
    await queryRunner.query(
      `CREATE TABLE "credential" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "credentialName" character varying NOT NULL, "encryptedData" text NOT NULL, "userId" uuid, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3a5169bcd3d5463cefeec78be82" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(
      `CREATE TABLE "tool" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" text NOT NULL, "color" character varying NOT NULL, "iconSrc" character varying, "schema" text, "func" text, "userId" uuid, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3bf5b1016a384916073184f99b7" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(
      `CREATE TABLE "assistant" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "details" text NOT NULL, "credential" uuid NOT NULL, "iconSrc" character varying, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_eb7d5dbc702c098df659e65c606" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(
      `CREATE TABLE "lead" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "email" character varying NOT NULL, "phone" character varying NOT NULL, "chatflowid" character varying NOT NULL, "chatId" character varying NOT NULL, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ca96c1888f7dcfccab72b72fffa" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(
      `CREATE TABLE "variable" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "value" text, "type" text NOT NULL DEFAULT 'string', "userId" uuid, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f4e200785984484787e6b47e6fb" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(
      `CREATE TABLE "document_store" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" text NOT NULL, "description" text, "loaders" text, "whereUsed" text, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "status" text NOT NULL, "vectorStoreConfig" text, "embeddingConfig" text, "recordManagerConfig" text, "userId" uuid, CONSTRAINT "PK_5ee21170e491c2cf30a31a88bcd" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(
      `CREATE TABLE "document_store_file_chunk" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "docId" uuid NOT NULL, "storeId" uuid NOT NULL, "chunkNo" integer NOT NULL, "pageContent" text NOT NULL, "metadata" text, CONSTRAINT "PK_7abd8838cca93044a047e041c06" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(`CREATE INDEX "IDX_e28550b1dd9e091193fa3ed22a" ON "document_store_file_chunk" ("docId") `)
    await queryRunner.query(`CREATE INDEX "IDX_c791442eeab0fbf5219b6f78c0" ON "document_store_file_chunk" ("storeId") `)
    await queryRunner.query(
      `CREATE TABLE "chat_message_feedback" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "chatflowid" uuid NOT NULL, "chatId" character varying NOT NULL, "messageId" uuid NOT NULL, "rating" character varying, "content" text, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_6352078b5a294f2d22179ea7955" UNIQUE ("messageId"), CONSTRAINT "PK_740c19acef166b0c09a35971b12" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(`CREATE INDEX "IDX_f56c36fe42894d57e5c664d229" ON "chat_message_feedback" ("chatflowid") `)
    await queryRunner.query(`CREATE INDEX "IDX_9acddcb7a2b51fe37669049fc6" ON "chat_message_feedback" ("chatId") `)
    await queryRunner.query(
      `CREATE TABLE "upsert_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "chatflowid" character varying NOT NULL, "result" character varying NOT NULL, "flowData" character varying NOT NULL, "date" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_75727f3ec61a59af4d7c6f503b5" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(`CREATE INDEX "IDX_4572bbe0437c04b9842d802a0c" ON "upsert_history" ("chatflowid") `)
    await queryRunner.query(
      `CREATE TABLE "apikey" ("id" character varying(20) NOT NULL, "apiKey" text NOT NULL, "apiSecret" text NOT NULL, "keyName" text NOT NULL, "userId" uuid, "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0a1358bea3e5a3ba047b6e4959c" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(
      `CREATE TABLE "custom_template" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "flowData" text NOT NULL, "description" text, "badge" text, "framework" text, "usecases" text, "type" text, "userId" uuid, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_56fdcd8c40cb9e0a4682f7378cb" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(
      `ALTER TABLE "chat_flow" ADD CONSTRAINT "FK_eabfcfed8674ccc376ac2ed5e30" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chat_flow" DROP CONSTRAINT "FK_eabfcfed8674ccc376ac2ed5e30"`)
    await queryRunner.query(`DROP TABLE "custom_template"`)
    await queryRunner.query(`DROP TABLE "apikey"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_4572bbe0437c04b9842d802a0c"`)
    await queryRunner.query(`DROP TABLE "upsert_history"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_9acddcb7a2b51fe37669049fc6"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_f56c36fe42894d57e5c664d229"`)
    await queryRunner.query(`DROP TABLE "chat_message_feedback"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_c791442eeab0fbf5219b6f78c0"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_e28550b1dd9e091193fa3ed22a"`)
    await queryRunner.query(`DROP TABLE "document_store_file_chunk"`)
    await queryRunner.query(`DROP TABLE "document_store"`)
    await queryRunner.query(`DROP TABLE "variable"`)
    await queryRunner.query(`DROP TABLE "lead"`)
    await queryRunner.query(`DROP TABLE "assistant"`)
    await queryRunner.query(`DROP TABLE "tool"`)
    await queryRunner.query(`DROP TABLE "credential"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_e574527322272fd838f4f0f3d3"`)
    await queryRunner.query(`DROP TABLE "chat_message"`)
    await queryRunner.query(`DROP TABLE "chat_flow"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_fe0bb3f6520ee0469504521e71"`)
    await queryRunner.query(`DROP TABLE "users"`)
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`)
  }
}
