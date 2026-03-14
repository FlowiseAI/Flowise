import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddScheduleEntities1772000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS schedule_record (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "triggerType" varchar(32) NOT NULL,
                "targetId" varchar NOT NULL,
                "nodeId" text,
                "cronExpression" text NOT NULL,
                "timezone" varchar(64) NOT NULL DEFAULT 'UTC',
                "enabled" boolean NOT NULL DEFAULT true,
                "defaultInput" text,
                "lastRunAt" timestamp,
                "nextRunAt" timestamp,
                "workspaceId" varchar NOT NULL,
                "createdDate" timestamp NOT NULL DEFAULT now(),
                "updatedDate" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_schedule_record" PRIMARY KEY (id)
            );
        `)

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_schedule_record_targetId" ON schedule_record ("targetId");`)

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS schedule_trigger_log (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "scheduleRecordId" varchar NOT NULL,
                "triggerType" varchar(32) NOT NULL,
                "targetId" varchar NOT NULL,
                "executionId" varchar,
                "status" varchar(32) NOT NULL,
                "error" text,
                "elapsedTimeMs" integer,
                "scheduledAt" timestamp NOT NULL,
                "workspaceId" varchar NOT NULL,
                "createdDate" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_schedule_trigger_log" PRIMARY KEY (id)
            );
        `)

        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_schedule_trigger_log_scheduleRecordId" ON schedule_trigger_log ("scheduleRecordId");`
        )
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_schedule_trigger_log_targetId" ON schedule_trigger_log ("targetId");`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS schedule_trigger_log`)
        await queryRunner.query(`DROP TABLE IF EXISTS schedule_record`)
    }
}
