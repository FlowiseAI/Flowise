import { MigrationInterface, QueryRunner } from 'typeorm'

export class Init1737132961755 implements MigrationInterface {
    name = 'Init1737132961755'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "chat_flow" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_3c7cea7d047ac4b91764574cdbf" DEFAULT NEWSEQUENTIALID(), "name" nvarchar(255) NOT NULL, "flowData" text NOT NULL, "deployed" bit, "isPublic" bit, "apikeyid" nvarchar(255), "chatbotConfig" text, "apiConfig" text, "analytic" text, "speechToText" text, "followUpPrompts" text, "category" text, "type" text, "createdDate" datetime2 NOT NULL CONSTRAINT "DF_91ecb75b2e7c0efe485e74a3abc" DEFAULT getdate(), "updatedDate" datetime2 NOT NULL CONSTRAINT "DF_1b53d9e585b85a7d23a05310303" DEFAULT getdate(), CONSTRAINT "PK_3c7cea7d047ac4b91764574cdbf" PRIMARY KEY ("id"))`
        )
        await queryRunner.query(
            `CREATE TABLE "chat_message" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_3cc0d85193aade457d3077dd06b" DEFAULT NEWSEQUENTIALID(), "role" nvarchar(255) NOT NULL, "chatflowid" uniqueidentifier NOT NULL, "content" text NOT NULL, "sourceDocuments" text, "usedTools" text, "fileAnnotations" text, "agentReasoning" text, "fileUploads" text, "artifacts" text, "action" text, "chatType" nvarchar(255) NOT NULL, "chatId" varchar(255) NOT NULL, "memoryType" nvarchar(255), "sessionId" varchar(255), "createdDate" datetime2 NOT NULL CONSTRAINT "DF_01819b5a5c2c075f026a865a5ac" DEFAULT getdate(), "leadEmail" text, "followUpPrompts" text, CONSTRAINT "PK_3cc0d85193aade457d3077dd06b" PRIMARY KEY ("id"))`
        )
        await queryRunner.query(`CREATE INDEX "IDX_e574527322272fd838f4f0f3d3" ON "chat_message" ("chatflowid") `)
        await queryRunner.query(
            `CREATE TABLE "credential" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_3a5169bcd3d5463cefeec78be82" DEFAULT NEWSEQUENTIALID(), "name" nvarchar(255) NOT NULL, "credentialName" nvarchar(255) NOT NULL, "encryptedData" text NOT NULL, "createdDate" datetime2 NOT NULL CONSTRAINT "DF_a2e950872d5cd3e7ee145a78580" DEFAULT getdate(), "updatedDate" datetime2 NOT NULL CONSTRAINT "DF_c755d4a6463921a49e08681925d" DEFAULT getdate(), CONSTRAINT "PK_3a5169bcd3d5463cefeec78be82" PRIMARY KEY ("id"))`
        )
        await queryRunner.query(
            `CREATE TABLE "tool" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_3bf5b1016a384916073184f99b7" DEFAULT NEWSEQUENTIALID(), "name" nvarchar(255) NOT NULL, "description" text NOT NULL, "color" nvarchar(255) NOT NULL, "iconSrc" nvarchar(255), "schema" text, "func" text, "createdDate" datetime2 NOT NULL CONSTRAINT "DF_b2cdbf502cf64d7d5883f6c2e6a" DEFAULT getdate(), "updatedDate" datetime2 NOT NULL CONSTRAINT "DF_480f2ce34bf78e1c951fa025804" DEFAULT getdate(), CONSTRAINT "PK_3bf5b1016a384916073184f99b7" PRIMARY KEY ("id"))`
        )
        await queryRunner.query(
            `CREATE TABLE "assistant" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_eb7d5dbc702c098df659e65c606" DEFAULT NEWSEQUENTIALID(), "details" text NOT NULL, "credential" uniqueidentifier NOT NULL, "iconSrc" nvarchar(255), "type" text, "createdDate" datetime2 NOT NULL CONSTRAINT "DF_ca30bf77cb04dbd7c3feccadb88" DEFAULT getdate(), "updatedDate" datetime2 NOT NULL CONSTRAINT "DF_65a7cfde1f0c3745d959f6ab6bd" DEFAULT getdate(), CONSTRAINT "PK_eb7d5dbc702c098df659e65c606" PRIMARY KEY ("id"))`
        )
        await queryRunner.query(
            `CREATE TABLE "lead" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_ca96c1888f7dcfccab72b72fffa" DEFAULT NEWSEQUENTIALID(), "name" nvarchar(255) NOT NULL, "email" nvarchar(255) NOT NULL, "phone" nvarchar(255) NOT NULL, "chatflowid" nvarchar(255) NOT NULL, "chatId" nvarchar(255) NOT NULL, "createdDate" datetime2 NOT NULL CONSTRAINT "DF_e9e181cbb70f1afb6d04c42dca6" DEFAULT getdate(), CONSTRAINT "PK_ca96c1888f7dcfccab72b72fffa" PRIMARY KEY ("id"))`
        )
        await queryRunner.query(
            `CREATE TABLE "variable" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_f4e200785984484787e6b47e6fb" DEFAULT NEWSEQUENTIALID(), "name" nvarchar(255) NOT NULL, "value" text, "type" text NOT NULL CONSTRAINT "DF_47114e281323aab90fb632db614" DEFAULT 'string', "createdDate" datetime2 NOT NULL CONSTRAINT "DF_132993f831692a059275c2318bd" DEFAULT getdate(), "updatedDate" datetime2 NOT NULL CONSTRAINT "DF_b91ac9805307a9b213cd13c3dea" DEFAULT getdate(), CONSTRAINT "PK_f4e200785984484787e6b47e6fb" PRIMARY KEY ("id"))`
        )
        await queryRunner.query(
            `CREATE TABLE "document_store" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_5ee21170e491c2cf30a31a88bcd" DEFAULT NEWSEQUENTIALID(), "name" text NOT NULL, "description" text, "loaders" text, "whereUsed" text, "createdDate" datetime2 NOT NULL CONSTRAINT "DF_98297203ed30a4e523406c02dd5" DEFAULT getdate(), "updatedDate" datetime2 NOT NULL CONSTRAINT "DF_7b3f4b9afd649ba74711fb99382" DEFAULT getdate(), "status" text NOT NULL, "vectorStoreConfig" text, "embeddingConfig" text, "recordManagerConfig" text, CONSTRAINT "PK_5ee21170e491c2cf30a31a88bcd" PRIMARY KEY ("id"))`
        )
        await queryRunner.query(
            `CREATE TABLE "document_store_file_chunk" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_7abd8838cca93044a047e041c06" DEFAULT NEWSEQUENTIALID(), "docId" uniqueidentifier NOT NULL, "storeId" uniqueidentifier NOT NULL, "chunkNo" int NOT NULL, "pageContent" text NOT NULL, "metadata" text, CONSTRAINT "PK_7abd8838cca93044a047e041c06" PRIMARY KEY ("id"))`
        )
        await queryRunner.query(`CREATE INDEX "IDX_e28550b1dd9e091193fa3ed22a" ON "document_store_file_chunk" ("docId") `)
        await queryRunner.query(`CREATE INDEX "IDX_c791442eeab0fbf5219b6f78c0" ON "document_store_file_chunk" ("storeId") `)
        await queryRunner.query(
            `CREATE TABLE "chat_message_feedback" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_740c19acef166b0c09a35971b12" DEFAULT NEWSEQUENTIALID(), "chatflowid" uniqueidentifier NOT NULL, "chatId" varchar(255) NOT NULL, "messageId" uniqueidentifier NOT NULL, "rating" nvarchar(255), "content" text, "createdDate" datetime2 NOT NULL CONSTRAINT "DF_e9b20bd5c4d249d9cab99044ed3" DEFAULT getdate(), CONSTRAINT "UQ_6352078b5a294f2d22179ea7955" UNIQUE ("messageId"), CONSTRAINT "PK_740c19acef166b0c09a35971b12" PRIMARY KEY ("id"))`
        )
        await queryRunner.query(`CREATE INDEX "IDX_f56c36fe42894d57e5c664d229" ON "chat_message_feedback" ("chatflowid") `)
        await queryRunner.query(`CREATE INDEX "IDX_9acddcb7a2b51fe37669049fc6" ON "chat_message_feedback" ("chatId") `)
        await queryRunner.query(
            `CREATE TABLE "upsert_history" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_75727f3ec61a59af4d7c6f503b5" DEFAULT NEWSEQUENTIALID(), "chatflowid" nvarchar(255) NOT NULL, "result" nvarchar(255) NOT NULL, "flowData" nvarchar(255) NOT NULL, "date" datetime2 NOT NULL CONSTRAINT "DF_78ec9c76a61f2e4c542125b8783" DEFAULT getdate(), CONSTRAINT "PK_75727f3ec61a59af4d7c6f503b5" PRIMARY KEY ("id"))`
        )
        await queryRunner.query(`CREATE INDEX "IDX_4572bbe0437c04b9842d802a0c" ON "upsert_history" ("chatflowid") `)
        await queryRunner.query(
            `CREATE TABLE "apikey" ("id" varchar(20) NOT NULL, "apiKey" text NOT NULL, "apiSecret" text NOT NULL, "keyName" text NOT NULL, "updatedDate" datetime2 NOT NULL CONSTRAINT "DF_78877428008123cf7468f379edf" DEFAULT getdate(), CONSTRAINT "PK_0a1358bea3e5a3ba047b6e4959c" PRIMARY KEY ("id"))`
        )
        await queryRunner.query(
            `CREATE TABLE "custom_template" ("id" uniqueidentifier NOT NULL CONSTRAINT "DF_56fdcd8c40cb9e0a4682f7378cb" DEFAULT NEWSEQUENTIALID(), "name" nvarchar(255) NOT NULL, "flowData" text NOT NULL, "description" text, "badge" text, "framework" text, "usecases" text, "type" text, "createdDate" datetime2 NOT NULL CONSTRAINT "DF_4c54cd88cda807785a1ef850669" DEFAULT getdate(), "updatedDate" datetime2 NOT NULL CONSTRAINT "DF_ff4f642535576938da96d8b3e94" DEFAULT getdate(), CONSTRAINT "PK_56fdcd8c40cb9e0a4682f7378cb" PRIMARY KEY ("id"))`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "custom_template"`)
        await queryRunner.query(`DROP TABLE "apikey"`)
        await queryRunner.query(`DROP INDEX "IDX_4572bbe0437c04b9842d802a0c" ON "upsert_history"`)
        await queryRunner.query(`DROP TABLE "upsert_history"`)
        await queryRunner.query(`DROP INDEX "IDX_9acddcb7a2b51fe37669049fc6" ON "chat_message_feedback"`)
        await queryRunner.query(`DROP INDEX "IDX_f56c36fe42894d57e5c664d229" ON "chat_message_feedback"`)
        await queryRunner.query(`DROP TABLE "chat_message_feedback"`)
        await queryRunner.query(`DROP INDEX "IDX_c791442eeab0fbf5219b6f78c0" ON "document_store_file_chunk"`)
        await queryRunner.query(`DROP INDEX "IDX_e28550b1dd9e091193fa3ed22a" ON "document_store_file_chunk"`)
        await queryRunner.query(`DROP TABLE "document_store_file_chunk"`)
        await queryRunner.query(`DROP TABLE "document_store"`)
        await queryRunner.query(`DROP TABLE "variable"`)
        await queryRunner.query(`DROP TABLE "lead"`)
        await queryRunner.query(`DROP TABLE "assistant"`)
        await queryRunner.query(`DROP TABLE "tool"`)
        await queryRunner.query(`DROP TABLE "credential"`)
        await queryRunner.query(`DROP INDEX "IDX_e574527322272fd838f4f0f3d3" ON "chat_message"`)
        await queryRunner.query(`DROP TABLE "chat_message"`)
        await queryRunner.query(`DROP TABLE "chat_flow"`)
    }
}
