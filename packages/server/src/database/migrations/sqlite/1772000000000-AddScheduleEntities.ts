import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddScheduleEntities1772000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "schedule_record" (
                "id" varchar PRIMARY KEY NOT NULL,
                "triggerType" varchar(32) NOT NULL,
                "targetId" varchar NOT NULL,
                "nodeId" text,
                "cronExpression" text NOT NULL,
                "timezone" varchar(64) NOT NULL DEFAULT 'UTC',
                "enabled" boolean NOT NULL DEFAULT 1,
                "defaultInput" text,
                "lastRunAt" datetime,
                "nextRunAt" datetime,
                "workspaceId" varchar NOT NULL,
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now'))
            );
        `)

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_schedule_record_targetId" ON "schedule_record" ("targetId");`)

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "schedule_trigger_log" (
                "id" varchar PRIMARY KEY NOT NULL,
                "scheduleRecordId" varchar NOT NULL,
                "triggerType" varchar(32) NOT NULL,
                "targetId" varchar NOT NULL,
                "executionId" varchar,
                "status" varchar(32) NOT NULL,
                "error" text,
                "elapsedTimeMs" integer,
                "scheduledAt" datetime NOT NULL,
                "workspaceId" varchar NOT NULL,
                "createdDate" datetime NOT NULL DEFAULT (datetime('now'))
            );
        `)

        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_schedule_trigger_log_scheduleRecordId" ON "schedule_trigger_log" ("scheduleRecordId");`
        )
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_schedule_trigger_log_targetId" ON "schedule_trigger_log" ("targetId");`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "schedule_trigger_log"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "schedule_record"`)
    }
}
