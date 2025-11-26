import { MigrationInterface, QueryRunner } from 'typeorm'
import { ensureColumnExists } from './sqlliteCustomFunctions'

export class ExecutionLinkWorkspaceId1746862866554 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await ensureColumnExists(queryRunner, 'execution', 'workspaceId', 'TEXT')

        // step 1 - create temp table with workspaceId as foreign key
        await queryRunner.query(`
        CREATE TABLE "temp_execution" (
            "id" varchar PRIMARY KEY NOT NULL,
            "executionData" text NOT NULL,
            "action" text,
            "state" varchar NOT NULL,
            "agentflowId" varchar NOT NULL,
            "sessionId" varchar NOT NULL,
            "isPublic" boolean,
            "createdDate" datetime NOT NULL DEFAULT (datetime('now')),
            "updatedDate" datetime NOT NULL DEFAULT (datetime('now')),
            "stoppedDate" datetime,
            "workspaceId" varchar,
            FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id")
        );
    `)

        // step 2 - create index for workspaceId in temp_execution table
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_execution_workspaceId" ON "temp_execution"("workspaceId");`)

        // step 3 - migrate data
        await queryRunner.query(`
        INSERT INTO "temp_execution" ("id", "executionData", "action", "state", "agentflowId", "sessionId", "isPublic", "createdDate", "updatedDate", "stoppedDate")
        SELECT "id", "executionData", "action", "state", "agentflowId", "sessionId", "isPublic", "createdDate", "updatedDate", "stoppedDate" FROM "execution";
    `)

        // step 4 - drop execution table
        await queryRunner.query(`DROP TABLE "execution";`)

        // step 5 - alter temp_execution to execution table
        await queryRunner.query(`ALTER TABLE "temp_execution" RENAME TO "execution";`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "execution" DROP COLUMN "workspaceId";`)

        // step 1 - create temp table without workspaceId as foreign key
        await queryRunner.query(`
            CREATE TABLE "temp_execution" (
                "id" varchar PRIMARY KEY NOT NULL,
                "executionData" text NOT NULL,
                "action" text,
                "state" varchar NOT NULL,
                "agentflowId" varchar NOT NULL,
                "sessionId" varchar NOT NULL,
                "isPublic" boolean,
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')),
                "stoppedDate" datetime
            );
        `)

        // step 2 - migrate data
        await queryRunner.query(`
            INSERT INTO "temp_execution" ("id", "executionData", "action", "state", "agentflowId", "sessionId", "isPublic", "createdDate", "updatedDate", "stoppedDate")
            SELECT "id", "executionData", "action", "state", "agentflowId", "sessionId", "isPublic", "createdDate", "updatedDate", "stoppedDate" FROM "execution";
        `)

        // step 3 - drop execution table
        await queryRunner.query(`DROP TABLE "execution";`)

        // step 4 - alter temp_execution to execution table
        await queryRunner.query(`ALTER TABLE "temp_execution" RENAME TO "execution";`)
    }
}
