import { MigrationInterface, QueryRunner } from 'typeorm'
import { ensureColumnExists } from './sqlliteCustomFunctions'

export class AddWorkspace1720230151484 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "workspace" ("id" varchar PRIMARY KEY NOT NULL, 
"name" text NOT NULL, 
"description" varchar, 
"createdDate" datetime NOT NULL DEFAULT (datetime('now')), 
"updatedDate" datetime NOT NULL DEFAULT (datetime('now')));`
        )
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "workspace_users" ("id" varchar PRIMARY KEY NOT NULL,
"workspaceId" varchar NOT NULL,
"userId" varchar NOT NULL,
"role" varchar NOT NULL);`
        )

        await ensureColumnExists(queryRunner, 'chat_flow', 'workspaceId', 'TEXT')
        await ensureColumnExists(queryRunner, 'tool', 'workspaceId', 'TEXT')
        await ensureColumnExists(queryRunner, 'assistant', 'workspaceId', 'TEXT')
        await ensureColumnExists(queryRunner, 'credential', 'workspaceId', 'TEXT')
        await ensureColumnExists(queryRunner, 'document_store', 'workspaceId', 'TEXT')
        await ensureColumnExists(queryRunner, 'evaluation', 'workspaceId', 'TEXT')
        await ensureColumnExists(queryRunner, 'evaluator', 'workspaceId', 'TEXT')
        await ensureColumnExists(queryRunner, 'dataset', 'workspaceId', 'TEXT')
        await ensureColumnExists(queryRunner, 'apikey', 'workspaceId', 'TEXT')
        await ensureColumnExists(queryRunner, 'variable', 'workspaceId', 'TEXT')
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE workspace`)
        await queryRunner.query(`DROP TABLE workspace_users`)

        await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "workspaceId";`)
        await queryRunner.query(`ALTER TABLE "tool" DROP COLUMN "workspaceId";`)
        await queryRunner.query(`ALTER TABLE "assistant" DROP COLUMN "workspaceId";`)
        await queryRunner.query(`ALTER TABLE "credential" DROP COLUMN "workspaceId";`)
        await queryRunner.query(`ALTER TABLE "document_store" DROP COLUMN "workspaceId";`)
        await queryRunner.query(`ALTER TABLE "evaluation" DROP COLUMN "workspaceId";`)
        await queryRunner.query(`ALTER TABLE "evaluator" DROP COLUMN "workspaceId";`)
        await queryRunner.query(`ALTER TABLE "dataset" DROP COLUMN "workspaceId";`)
        await queryRunner.query(`ALTER TABLE "apikey" DROP COLUMN "workspaceId";`)
        await queryRunner.query(`ALTER TABLE "variable" DROP COLUMN "workspaceId";`)
    }
}
