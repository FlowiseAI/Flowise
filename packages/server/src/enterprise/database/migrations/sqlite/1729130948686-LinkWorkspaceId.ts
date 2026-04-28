import { MigrationInterface, QueryRunner } from 'typeorm'

export async function linkWorkspaceId(queryRunner: QueryRunner, include = true) {
    /*-------------------------------------
    ---------------- ApiKey ---------------
    --------------------------------------*/
    // step 1 - create temp table with workspaceId as foreign key
    await queryRunner.query(`
            CREATE TABLE "temp_apikey" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "apiKey" varchar NOT NULL, 
                "apiSecret" varchar NOT NULL, 
                "keyName" varchar NOT NULL, 
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')),
                "workspaceId" varchar,
                FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id")
            );
        `)

    // step 2 - create index for workspaceId in temp_apikey table
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_apikey_workspaceId" ON "temp_apikey"("workspaceId");`)

    // step 3 - migrate data
    await queryRunner.query(`
            INSERT INTO "temp_apikey" ("id", "apiKey", "apiSecret", "keyName", "createdDate", "updatedDate", "workspaceId")
            SELECT "id", "apiKey", "apiSecret", "keyName", "updatedDate", "updatedDate", "workspaceId" FROM "apikey";
        `)

    // step 4 - drop apikey table
    await queryRunner.query(`DROP TABLE "apikey";`)

    // step 5 - alter temp_apikey to apikey table
    await queryRunner.query(`ALTER TABLE "temp_apikey" RENAME TO "apikey";`)

    /*-------------------------------------
    ---------------- User ---------------
    --------------------------------------*/
    if (include) {
        // step 1 - create temp table with activeWorkspaceId as foreign key
        await queryRunner.query(`
                CREATE TABLE "temp_user" (
                    "id" varchar PRIMARY KEY NOT NULL, 
                    "role" varchar NOT NULL, 
                    "name" varchar, 
                    "credential" text, 
                    "tempToken" text, 
                    "tokenExpiry" datetime,
                    "email" varchar NOT NULL, 
                    "status" varchar NOT NULL, 
                    "lastLogin" datetime,
                    "activeWorkspaceId" varchar NOT NULL, 
                    FOREIGN KEY ("activeWorkspaceId") REFERENCES "workspace"("id")
                );
            `)

        // step 2 - create index for activeWorkspaceId in temp_user table
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_user_activeWorkspaceId" ON "temp_user"("activeWorkspaceId");`)

        // step 3 - migrate data
        await queryRunner.query(`
                INSERT INTO "temp_user" ("id", "role", "name", "credential", "tempToken", "tokenExpiry", "email", "status", "lastLogin", "activeWorkspaceId")
                SELECT "id", "role", "name", "credential", "tempToken", "tokenExpiry", "email", "status", "lastLogin", "activeWorkspaceId" FROM "user";
            `)

        // step 4 - drop user table
        await queryRunner.query(`DROP TABLE "user";`)

        // step 5 - alter temp_user to user table
        await queryRunner.query(`ALTER TABLE "temp_user" RENAME TO "user";`)
    }

    /*----------------------------------------------
    ---------------- Workspace Users ---------------
    ------------------------------------------------*/

    if (include) {
        // step 1 - create temp table with workspaceId as foreign key
        await queryRunner.query(`
                CREATE TABLE "temp_workspace_users" (
                    "id" varchar PRIMARY KEY NOT NULL,
                    "workspaceId" varchar NOT NULL,
                    "userId" varchar NOT NULL,
                    "role" varchar NOT NULL,
                    FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id")
                );
            `)

        // step 2 - create index for workspaceId in temp_workspace_users table
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_workspace_users_workspaceId" ON "temp_workspace_users"("workspaceId");`)

        // step 3 - migrate data
        await queryRunner.query(`
                INSERT INTO "temp_workspace_users" ("id", "workspaceId", "userId", "role")
                SELECT "id", "workspaceId", "userId", "role" FROM "workspace_users";
            `)

        // step 4 - drop workspace_users table
        await queryRunner.query(`DROP TABLE "workspace_users";`)

        // step 5 - alter temp_workspace_users to workspace_users table
        await queryRunner.query(`ALTER TABLE "temp_workspace_users" RENAME TO "workspace_users";`)
    }

    /*----------------------------------------------
    ---------------- Chatflow ----------------------
    ------------------------------------------------*/

    // step 1 - create temp table with workspaceId as foreign key
    await queryRunner.query(`
            CREATE TABLE "temp_chat_flow" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "name" varchar NOT NULL, 
                "flowData" text NOT NULL, 
                "deployed" boolean, 
                "isPublic" boolean, 
                "apikeyid" varchar, 
                "chatbotConfig" text, 
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "apiConfig" TEXT, 
                "analytic" TEXT, 
                "category" TEXT, 
                "speechToText" TEXT, 
                "type" TEXT, 
                "workspaceId" TEXT, 
                "followUpPrompts" TEXT,
                FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id")
            );
        `)

    // step 2 - create index for workspaceId in temp_chat_flow table
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_chat_flow_workspaceId" ON "temp_chat_flow"("workspaceId");`)

    // step 3 - migrate data
    await queryRunner.query(`
            INSERT INTO "temp_chat_flow" ("id", "name", "flowData", "deployed", "isPublic", "apikeyid", "chatbotConfig", "createdDate", "updatedDate", "apiConfig", "analytic", "category", "speechToText", "type", "workspaceId", "followUpPrompts")
            SELECT "id", "name", "flowData", "deployed", "isPublic", "apikeyid", "chatbotConfig", "createdDate", "updatedDate", "apiConfig", "analytic", "category", "speechToText", "type", "workspaceId", "followUpPrompts" FROM "chat_flow";
        `)

    // step 4 - drop chat_flow table
    await queryRunner.query(`DROP TABLE "chat_flow";`)

    // step 5 - alter temp_chat_flow to chat_flow table
    await queryRunner.query(`ALTER TABLE "temp_chat_flow" RENAME TO "chat_flow";`)

    /*----------------------------------------------
    ---------------- Tool --------------------------
    ------------------------------------------------*/

    // step 1 - create temp table with workspaceId as foreign key
    await queryRunner.query(`
            CREATE TABLE "temp_tool" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "name" varchar NOT NULL, 
                "description" text NOT NULL, 
                "color" varchar NOT NULL, 
                "iconSrc" varchar, 
                "schema" text, 
                "func" text, 
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "workspaceId" TEXT,
                FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id")
            );
        `)

    // step 2 - create index for workspaceId in temp_tool table
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tool_workspaceId" ON "temp_tool"("workspaceId");`)

    // step 3 - migrate data
    await queryRunner.query(`
            INSERT INTO "temp_tool" ("id", "name", "description", "color", "iconSrc", "schema", "func", "createdDate", "updatedDate", "workspaceId")
            SELECT "id", "name", "description", "color", "iconSrc", "schema", "func", "createdDate", "updatedDate", "workspaceId" FROM "tool";
        `)

    // step 4 - drop tool table
    await queryRunner.query(`DROP TABLE "tool";`)

    // step 5 - alter temp_tool to tool table
    await queryRunner.query(`ALTER TABLE "temp_tool" RENAME TO "tool";`)

    /*----------------------------------------------
    ---------------- Assistant ----------------------
    ------------------------------------------------*/

    // step 1 - create temp table with workspaceId as foreign key
    await queryRunner.query(`
            CREATE TABLE "temp_assistant" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "details" text NOT NULL, 
                "credential" varchar NOT NULL, 
                "iconSrc" varchar, 
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "workspaceId" TEXT,
                FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id")
            );
        `)

    // step 2 - create index for workspaceId in temp_assistant table
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_assistant_workspaceId" ON "temp_assistant"("workspaceId");`)

    // step 3 - migrate data
    await queryRunner.query(`
            INSERT INTO "temp_assistant" ("id", "details", "credential", "iconSrc", "createdDate", "updatedDate", "workspaceId")
            SELECT "id", "details", "credential", "iconSrc", "createdDate", "updatedDate", "workspaceId" FROM "assistant";
        `)

    // step 4 - drop assistant table
    await queryRunner.query(`DROP TABLE "assistant";`)

    // step 5 - alter temp_assistant to assistant table
    await queryRunner.query(`ALTER TABLE "temp_assistant" RENAME TO "assistant";`)

    /*----------------------------------------------
    ---------------- Credential ----------------------
    ------------------------------------------------*/

    // step 1 - create temp table with workspaceId as foreign key
    await queryRunner.query(`
            CREATE TABLE "temp_credential" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "name" varchar NOT NULL, 
                "credentialName" varchar NOT NULL, 
                "encryptedData" text NOT NULL, 
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "workspaceId" TEXT,
                FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id")
            );
        `)

    // step 2 - create index for workspaceId in temp_credential table
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_credential_workspaceId" ON "temp_credential"("workspaceId");`)

    // step 3 - migrate data
    await queryRunner.query(`
            INSERT INTO "temp_credential" ("id", "name", "credentialName", "encryptedData", "createdDate", "updatedDate", "workspaceId")
            SELECT "id", "name", "credentialName", "encryptedData", "createdDate", "updatedDate", "workspaceId" FROM "credential";
        `)

    // step 4 - drop credential table
    await queryRunner.query(`DROP TABLE "credential";`)

    // step 5 - alter temp_credential to credential table
    await queryRunner.query(`ALTER TABLE "temp_credential" RENAME TO "credential";`)

    /*---------------------------------------------------
    ---------------- Document Store ----------------------
    -----------------------------------------------------*/

    // step 1 - create temp table with workspaceId as foreign key
    await queryRunner.query(`
            CREATE TABLE "temp_document_store" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "name" varchar NOT NULL, 
                "description" varchar, 
                "status" varchar NOT NULL, 
                "loaders" text, 
                "whereUsed" text, 
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')),
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "vectorStoreConfig" TEXT, 
                "embeddingConfig" TEXT, 
                "recordManagerConfig" TEXT, 
                "workspaceId" TEXT,
                FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id")
            );
        `)

    // step 2 - create index for workspaceId in temp_document_store table
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_document_store_workspaceId" ON "temp_document_store"("workspaceId");`)

    // step 3 - migrate data
    await queryRunner.query(`
            INSERT INTO "temp_document_store" ("id", "name", "description", "status", "loaders", "whereUsed", "updatedDate", "createdDate", "vectorStoreConfig", "embeddingConfig", "recordManagerConfig", "workspaceId")
            SELECT "id", "name", "description", "status", "loaders", "whereUsed", "updatedDate", "createdDate", "vectorStoreConfig", "embeddingConfig", "recordManagerConfig", "workspaceId" FROM "document_store";
        `)

    // step 4 - drop document_store table
    await queryRunner.query(`DROP TABLE "document_store";`)

    // step 5 - alter temp_document_store to document_store table
    await queryRunner.query(`ALTER TABLE "temp_document_store" RENAME TO "document_store";`)

    /*---------------------------------------------------
    ---------------- Evaluation -------------------------
    -----------------------------------------------------*/

    // step 1 - create temp table with workspaceId as foreign key
    await queryRunner.query(`
            CREATE TABLE "temp_evaluation" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "name" varchar NOT NULL, 
                "chatflowId" text NOT NULL, 
                "chatflowName" text NOT NULL, 
                "datasetId" varchar NOT NULL, 
                "datasetName" varchar NOT NULL, 
                "additionalConfig" text, 
                "status" varchar NOT NULL, 
                "evaluationType" varchar, 
                "average_metrics" text, 
                "runDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "workspaceId" TEXT,
                FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id")
            );
        `)

    // step 2 - create index for workspaceId in temp_evaluation table
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_evaluation_workspaceId" ON "temp_evaluation"("workspaceId");`)

    // step 3 - migrate data
    await queryRunner.query(`
            INSERT INTO "temp_evaluation" ("id", "name", "chatflowId", "chatflowName", "datasetId", "datasetName", "additionalConfig", "status", "evaluationType", "average_metrics", "runDate", "workspaceId")
            SELECT "id", "name", "chatflowId", "chatflowName", "datasetId", "datasetName", "additionalConfig", "status", "evaluationType", "average_metrics", "runDate", "workspaceId" FROM "evaluation";
        `)

    // step 4 - drop evaluation table
    await queryRunner.query(`DROP TABLE "evaluation";`)

    // step 5 - alter temp_evaluation to evaluation table
    await queryRunner.query(`ALTER TABLE "temp_evaluation" RENAME TO "evaluation";`)

    /*---------------------------------------------------
    ---------------- Evaluator -------------------------
    -----------------------------------------------------*/

    // step 1 - create temp table with workspaceId as foreign key
    await queryRunner.query(`
            CREATE TABLE "temp_evaluator" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "name" text NOT NULL, 
                "type" varchar, 
                "config" text, 
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "workspaceId" TEXT,
                FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id")
            );
        `)

    // step 2 - create index for workspaceId in temp_evaluator table
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_evaluator_workspaceId" ON "temp_evaluator"("workspaceId");`)

    // step 3 - migrate data
    await queryRunner.query(`
            INSERT INTO "temp_evaluator" ("id", "name", "type", "config", "createdDate", "updatedDate", "workspaceId")
            SELECT "id", "name", "type", "config", "createdDate", "updatedDate", "workspaceId" FROM "evaluator";
        `)

    // step 4 - drop evaluator table
    await queryRunner.query(`DROP TABLE "evaluator";`)

    // step 5 - alter temp_evaluator to evaluator table
    await queryRunner.query(`ALTER TABLE "temp_evaluator" RENAME TO "evaluator";`)

    /*---------------------------------------------------
    ---------------- Dataset -------------------------
    -----------------------------------------------------*/

    // step 1 - create temp table with workspaceId as foreign key
    await queryRunner.query(`
            CREATE TABLE "temp_dataset" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "name" text NOT NULL, 
                "description" varchar, 
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "workspaceId" TEXT,
                FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id")
            );
        `)

    // step 2 - create index for workspaceId in temp_dataset table
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_dataset_workspaceId" ON "temp_dataset"("workspaceId");`)

    // step 3 - migrate data
    await queryRunner.query(`
            INSERT INTO "temp_dataset" ("id", "name", "description", "createdDate", "updatedDate", "workspaceId")
            SELECT "id", "name", "description", "createdDate", "updatedDate", "workspaceId" FROM "dataset";
        `)

    // step 4 - drop dataset table
    await queryRunner.query(`DROP TABLE "dataset";`)

    // step 5 - alter temp_dataset to dataset table
    await queryRunner.query(`ALTER TABLE "temp_dataset" RENAME TO "dataset";`)

    /*---------------------------------------------------
    ---------------- Variable ---------------------------
    -----------------------------------------------------*/

    // step 1 - create temp table with workspaceId as foreign key
    await queryRunner.query(`
            CREATE TABLE "temp_variable" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "name" text NOT NULL, 
                "value" text NOT NULL, 
                "type" varchar, 
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "workspaceId" TEXT,
                FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id")
            );
        `)

    // step 2 - create index for workspaceId in temp_variable table
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_variable_workspaceId" ON "temp_variable"("workspaceId");`)

    // step 3 - migrate data
    await queryRunner.query(`
            INSERT INTO "temp_variable" ("id", "name", "value", "type", "createdDate", "updatedDate", "workspaceId")
            SELECT "id", "name", "value", "type", "createdDate", "updatedDate", "workspaceId" FROM "variable";
        `)

    // step 4 - drop variable table
    await queryRunner.query(`DROP TABLE "variable";`)

    // step 5 - alter temp_variable to variable table
    await queryRunner.query(`ALTER TABLE "temp_variable" RENAME TO "variable";`)

    /*---------------------------------------------------
    ---------------- Workspace Shared -------------------
    -----------------------------------------------------*/

    // step 1 - create temp table with workspaceId as foreign key
    await queryRunner.query(`
            CREATE TABLE "temp_workspace_shared" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "workspaceId" varchar NOT NULL, 
                "sharedItemId" varchar NOT NULL, 
                "itemType" varchar NOT NULL, 
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id")
            );
        `)

    // step 2 - create index for workspaceId in temp_workspace_shared table
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_workspace_shared_workspaceId" ON "temp_workspace_shared"("workspaceId");`)

    // step 3 - migrate data
    await queryRunner.query(`
            INSERT INTO "temp_workspace_shared" ("id", "workspaceId", "sharedItemId", "itemType", "createdDate", "updatedDate")
            SELECT "id", "workspaceId", "sharedItemId", "itemType", "createdDate", "updatedDate" FROM "workspace_shared";
        `)

    // step 4 - drop workspace_shared table
    await queryRunner.query(`DROP TABLE "workspace_shared";`)

    // step 5 - alter temp_workspace_shared to workspace_shared table
    await queryRunner.query(`ALTER TABLE "temp_workspace_shared" RENAME TO "workspace_shared";`)

    /*---------------------------------------------------
    ---------------- Custom Template -------------------
    -----------------------------------------------------*/

    // step 1 - create temp table with workspaceId as foreign key
    await queryRunner.query(`
            CREATE TABLE "temp_custom_template" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "name" varchar NOT NULL, 
                "flowData" text NOT NULL, 
                "description" varchar, 
                "badge" varchar, 
                "framework" varchar, 
                "usecases" varchar, 
                "type" varchar, 
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')),
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "workspaceId" TEXT,
                FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id")
            );
        `)

    // step 2 - create index for workspaceId in temp_custom_template table
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_custom_template_workspaceId" ON "temp_custom_template"("workspaceId");`)

    // step 3 - migrate data
    await queryRunner.query(`
            INSERT INTO "temp_custom_template" ("id", "name", "flowData", "description", "badge", "framework", "usecases", "type", "updatedDate", "createdDate", "workspaceId")
            SELECT "id", "name", "flowData", "description", "badge", "framework", "usecases", "type", "updatedDate", "createdDate", "workspaceId" FROM "custom_template";
        `)

    // step 4 - drop custom_template table
    await queryRunner.query(`DROP TABLE "custom_template";`)

    // step 5 - alter temp_custom_template to custom_template table
    await queryRunner.query(`ALTER TABLE "temp_custom_template" RENAME TO "custom_template";`)
}

export class LinkWorkspaceId1729130948686 implements MigrationInterface {
    name = 'LinkWorkspaceId1729130948686'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await linkWorkspaceId(queryRunner)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // step 1 - create temp table without workspaceId as foreign key
        await queryRunner.query(`
            CREATE TABLE "temp_apikey" (
                "id" varchar PRIMARY KEY NOT NULL,
                "apiKey" varchar,
                "apiSecret" varchar NOT NULL,
                "keyName" varchar NOT NULL,
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')),
                "workspaceId" varchar
            );
        `)

        // step 2 - migrate data
        await queryRunner.query(`
            INSERT INTO "temp_apikey" ("id", "apiKey", "apiSecret", "keyName", "updatedDate")
            SELECT "id", "apiKey", "apiSecret", "keyName", "updatedDate" FROM "apikey";
        `)

        // step 3 - drop apikey table
        await queryRunner.query(`DROP TABLE "apikey";`)

        // step 4 - alter temp_apikey to apiKey table
        await queryRunner.query(`ALTER TABLE "temp_apikey" RENAME TO "apikey";`)

        // step 1 - create temp table without activeWorkspaceId as foreign key
        await queryRunner.query(`
            CREATE TABLE "temp_user" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "role" varchar NOT NULL, 
                "name" varchar, 
                "credential" text, 
                "tempToken" text, 
                "tokenExpiry" datetime,
                "email" varchar NOT NULL, 
                "status" varchar NOT NULL, 
                "activeWorkspaceId" varchar NOT NULL, 
                "lastLogin" datetime
            );
        `)

        // step 2 - migrate data
        await queryRunner.query(`
            INSERT INTO "temp_user" ("id", "role", "name", "credential", "tempToken", "tokenExpiry", "email", "status", "lastLogin", "activeWorkspaceId")
            SELECT "id", "role", "name", "credential", "tempToken", "tokenExpiry", "email", "status", "lastLogin", "activeWorkspaceId" FROM "user";
        `)

        // step 3 - drop user table
        await queryRunner.query(`DROP TABLE "user";`)

        // step 4 - alter temp_user to user table
        await queryRunner.query(`ALTER TABLE "temp_user" RENAME TO "user";`)

        // step 1 - create temp table without workspaceId as foreign key
        await queryRunner.query(`
            CREATE TABLE "temp_workspace_users" (
                "id" varchar PRIMARY KEY NOT NULL,
                "workspaceId" varchar NOT NULL,
                "userId" varchar NOT NULL,
                "role" varchar NOT NULL
            );
        `)

        // step 2 - migrate data
        await queryRunner.query(`
            INSERT INTO "temp_workspace_users" ("id", "workspaceId", "userId", "role")
            SELECT "id", "workspaceId", "userId", "role" FROM "workspace_users";
        `)

        // step 3 - drop workspace_users table
        await queryRunner.query(`DROP TABLE "workspace_users";`)

        // step 4 - alter temp_workspace_users to workspace_users table
        await queryRunner.query(`ALTER TABLE "temp_workspace_users" RENAME TO "workspace_users";`)

        // step 1 - create temp table without workspaceId as foreign key
        await queryRunner.query(`
            CREATE TABLE "temp_chat_flow" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "name" varchar NOT NULL, 
                "flowData" text NOT NULL, 
                "deployed" boolean, 
                "isPublic" boolean, 
                "apikeyid" varchar, 
                "chatbotConfig" text, 
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "apiConfig" TEXT, 
                "analytic" TEXT, 
                "category" TEXT, 
                "speechToText" TEXT, 
                "type" TEXT, 
                "workspaceId" TEXT, 
                "followUpPrompts" TEXT
            );
        `)

        // step 2 - migrate data
        await queryRunner.query(`
                INSERT INTO "temp_chat_flow" ("id", "name", "flowData", "deployed", "isPublic", "apikeyid", "chatbotConfig", "createdDate", "updatedDate", "apiConfig", "analytic", "category", "speechToText", "type", "workspaceId", "followUpPrompts")
                SELECT "id", "name", "flowData", "deployed", "isPublic", "apikeyid", "chatbotConfig", "createdDate", "updatedDate", "apiConfig", "analytic", "category", "speechToText", "type", "workspaceId", "followUpPrompts" FROM "chat_flow";
        `)

        // step 3 - drop chat_flow table
        await queryRunner.query(`DROP TABLE "chat_flow";`)

        // step 4 - alter temp_chat_flow to chat_flow table
        await queryRunner.query(`ALTER TABLE "temp_chat_flow" RENAME TO "chat_flow";`)

        // step 1 - create temp table without workspaceId as foreign key
        await queryRunner.query(`
            CREATE TABLE "temp_tool" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "name" varchar NOT NULL, 
                "description" text NOT NULL, 
                "color" varchar NOT NULL, 
                "iconSrc" varchar, 
                "schema" text, 
                "func" text, 
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "workspaceId" TEXT
            );
        `)

        // step 2 - migrate data
        await queryRunner.query(`
                INSERT INTO "temp_tool" ("id", "name", "description", "color", "iconSrc", "schema", "func", "createdDate", "updatedDate", "workspaceId")
                SELECT "id", "name", "description", "color", "iconSrc", "schema", "func", "createdDate", "updatedDate", "workspaceId" FROM "tool";
        `)

        // step 3 - drop tool table
        await queryRunner.query(`DROP TABLE "tool";`)

        // step 4 - alter temp_tool to tool table
        await queryRunner.query(`ALTER TABLE "temp_tool" RENAME TO "tool";`)

        // step 1 - create temp table without workspaceId as foreign key
        await queryRunner.query(`
            CREATE TABLE "temp_assistant" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "details" text NOT NULL, 
                "credential" varchar NOT NULL, 
                "iconSrc" varchar, 
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "workspaceId" TEXT
            );
        `)

        // step 2 - migrate data
        await queryRunner.query(`
                INSERT INTO "temp_assistant" ("id", "details", "credential", "iconSrc", "createdDate", "updatedDate", "workspaceId")
                SELECT "id", "details", "credential", "iconSrc", "createdDate", "updatedDate", "workspaceId" FROM "assistant";
        `)

        // step 3 - drop assistant table
        await queryRunner.query(`DROP TABLE "assistant";`)

        // step 4 - alter temp_assistant to assistant table
        await queryRunner.query(`ALTER TABLE "temp_assistant" RENAME TO "assistant";`)

        // step 1 - create temp table without workspaceId as foreign key
        await queryRunner.query(`
            CREATE TABLE "temp_credential" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "name" varchar NOT NULL, 
                "credentialName" varchar NOT NULL, 
                "encryptedData" text NOT NULL, 
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "workspaceId" TEXT
            );
        `)

        // step 2 - migrate data
        await queryRunner.query(`
                INSERT INTO "temp_credential" ("id", "name", "credentialName", "encryptedData", "createdDate", "updatedDate", "workspaceId")
                SELECT "id", "name", "credentialName", "encryptedData", "createdDate", "updatedDate", "workspaceId" FROM "credential";
        `)

        // step 3 - drop credential table
        await queryRunner.query(`DROP TABLE "credential";`)

        // step 4 - alter temp_credential to credential table
        await queryRunner.query(`ALTER TABLE "temp_credential" RENAME TO "credential";`)

        // step 1 - create temp table without workspaceId as foreign key
        await queryRunner.query(`
            CREATE TABLE "temp_document_store" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "name" varchar NOT NULL, 
                "description" varchar, 
                "status" varchar NOT NULL, 
                "loaders" text, 
                "whereUsed" text, 
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')),
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "vectorStoreConfig" TEXT, 
                "embeddingConfig" TEXT, 
                "recordManagerConfig" TEXT, 
                "workspaceId" TEXT,
            );
        `)

        // step 2 - migrate data
        await queryRunner.query(`
                INSERT INTO "temp_document_store" ("id", "name", "description", "status", "loaders", "whereUsed", "updatedDate", "createdDate", "vectorStoreConfig", "embeddingConfig", "recordManagerConfig", "workspaceId")
                SELECT "id", "name", "description", "status", "loaders", "whereUsed", "updatedDate", "createdDate", "vectorStoreConfig", "embeddingConfig", "recordManagerConfig", "workspaceId" FROM "document_store";
        `)

        // step 3 - drop document_store table
        await queryRunner.query(`DROP TABLE "document_store";`)

        // step 4 - alter temp_document_store to document_store table
        await queryRunner.query(`ALTER TABLE "temp_document_store" RENAME TO "document_store";`)

        // step 1 - create temp table without workspaceId as foreign key
        await queryRunner.query(`
            CREATE TABLE "temp_evaluation" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "name" varchar NOT NULL, 
                "chatflowId" text NOT NULL, 
                "chatflowName" text NOT NULL, 
                "datasetId" varchar NOT NULL, 
                "datasetName" varchar NOT NULL, 
                "additionalConfig" text, 
                "status" varchar NOT NULL, 
                "evaluationType" varchar, 
                "average_metrics" text, 
                "runDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "workspaceId" TEXT
            );
        `)

        // step 2 - migrate data
        await queryRunner.query(`
                INSERT INTO "temp_evaluation" ("id", "name", "chatflowId", "chatflowName", "datasetId", "datasetName", "additionalConfig", "status", "evaluationType", "average_metrics", "runDate", "workspaceId")
                SELECT "id", "name", "chatflowId", "chatflowName", "datasetId", "datasetName", "additionalConfig", "status", "evaluationType", "average_metrics", "runDate", "workspaceId" FROM "evaluation";
        `)

        // step 3 - drop evaluation table
        await queryRunner.query(`DROP TABLE "evaluation";`)

        // step 4 - alter temp_evaluation to evaluation table
        await queryRunner.query(`ALTER TABLE "temp_evaluation" RENAME TO "evaluation";`)

        // step 1 - create temp table without workspaceId as foreign key
        await queryRunner.query(`
            CREATE TABLE "temp_evaluator" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "name" text NOT NULL, 
                "type" varchar, 
                "config" text, 
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "workspaceId" TEXT
            );
        `)

        // step 2 - migrate data
        await queryRunner.query(`
                INSERT INTO "temp_evaluator" ("id", "name", "type", "config", "createdDate", "updatedDate", "workspaceId")
                SELECT "id", "name", "type", "config", "createdDate", "updatedDate", "workspaceId" FROM "evaluator";
        `)

        // step 3 - drop evaluator table
        await queryRunner.query(`DROP TABLE "evaluator";`)

        // step 4 - alter temp_evaluator to evaluator table
        await queryRunner.query(`ALTER TABLE "temp_evaluator" RENAME TO "evaluator";`)

        // step 1 - create temp table without workspaceId as foreign key
        await queryRunner.query(`
            CREATE TABLE "temp_dataset" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "name" text NOT NULL, 
                "description" varchar, 
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "workspaceId" TEXT
            );
        `)

        // step 2 - migrate data
        await queryRunner.query(`
                INSERT INTO "temp_dataset" ("id", "name", "description", "createdDate", "updatedDate", "workspaceId")
                SELECT "id", "name", "description", "createdDate", "updatedDate", "workspaceId" FROM "dataset";
        `)

        // step 3 - drop dataset table
        await queryRunner.query(`DROP TABLE "dataset";`)

        // step 4 - alter temp_dataset to dataset table
        await queryRunner.query(`ALTER TABLE "temp_dataset" RENAME TO "dataset";`)

        // step 1 - create temp table without workspaceId as foreign key
        await queryRunner.query(`
            CREATE TABLE "temp_variable" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "name" text NOT NULL, 
                "value" text NOT NULL, 
                "type" varchar, 
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "workspaceId" TEXT
            );
        `)

        // step 2 - migrate data
        await queryRunner.query(`
                INSERT INTO "temp_variable" ("id", "name", "value", "type", "createdDate", "updatedDate", "workspaceId")
                SELECT "id", "name", "value", "type", "createdDate", "updatedDate", "workspaceId" FROM "variable";
        `)

        // step 3 - drop variable table
        await queryRunner.query(`DROP TABLE "variable";`)

        // step 4 - alter temp_variable to variable table
        await queryRunner.query(`ALTER TABLE "temp_variable" RENAME TO "variable";`)

        // step 1 - create temp table without workspaceId as foreign key
        await queryRunner.query(`
            CREATE TABLE "temp_workspace_shared" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "workspaceId" varchar NOT NULL, 
                "sharedItemId" varchar NOT NULL, 
                "itemType" varchar NOT NULL, 
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now'))
            );
        `)

        // step 2 - migrate data
        await queryRunner.query(`
                INSERT INTO "temp_workspace_shared" ("id", "workspaceId", "sharedItemId", "itemType", "createdDate", "updatedDate")
                SELECT "id", "workspaceId", "sharedItemId", "itemType", "createdDate", "updatedDate" FROM "workspace_shared";
        `)

        // step 3 - drop workspace_shared table
        await queryRunner.query(`DROP TABLE "workspace_shared";`)

        // step 4 - alter temp_workspace_shared to workspace_shared table
        await queryRunner.query(`ALTER TABLE "temp_workspace_shared" RENAME TO "workspace_shared";`)

        // step 1 - create temp table without workspaceId as foreign key
        await queryRunner.query(`
            CREATE TABLE "temp_custom_template" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "name" varchar NOT NULL, 
                "flowData" text NOT NULL, 
                "description" varchar, 
                "badge" varchar, 
                "framework" varchar, 
                "usecases" varchar, 
                "type" varchar, 
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')),
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "workspaceId" TEXT
            );
        `)

        // step 2 - migrate data
        await queryRunner.query(`
                INSERT INTO "temp_custom_template" ("id", "name", "flowData", "description", "badge", "framework", "usecases", "type", "updatedDate", "createdDate", "workspaceId")
                SELECT "id", "name", "flowData", "description", "badge", "framework", "usecases", "type", "updatedDate", "createdDate", "workspaceId" FROM "custom_template";
        `)

        // step 3 - drop custom_template table
        await queryRunner.query(`DROP TABLE "custom_template";`)

        // step 4 - alter temp_custom_template to custom_template table
        await queryRunner.query(`ALTER TABLE "temp_custom_template" RENAME TO "custom_template";`)
    }
}
