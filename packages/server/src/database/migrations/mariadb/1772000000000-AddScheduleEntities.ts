import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddScheduleEntities1772000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`schedule_record\` (
                \`id\` varchar(36) NOT NULL,
                \`triggerType\` varchar(32) NOT NULL,
                \`targetId\` varchar(255) NOT NULL,
                \`nodeId\` text,
                \`cronExpression\` text NOT NULL,
                \`timezone\` varchar(64) NOT NULL DEFAULT 'UTC',
                \`enabled\` tinyint(1) NOT NULL DEFAULT 1,
                \`defaultInput\` text,
                \`lastRunAt\` datetime(6),
                \`nextRunAt\` datetime(6),
                \`workspaceId\` varchar(255) NOT NULL,
                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
        `)

        await queryRunner.query(`CREATE INDEX \`IDX_schedule_record_targetId\` ON \`schedule_record\` (\`targetId\`);`)

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`schedule_trigger_log\` (
                \`id\` varchar(36) NOT NULL,
                \`scheduleRecordId\` varchar(255) NOT NULL,
                \`triggerType\` varchar(32) NOT NULL,
                \`targetId\` varchar(255) NOT NULL,
                \`executionId\` varchar(255),
                \`status\` varchar(32) NOT NULL,
                \`error\` text,
                \`elapsedTimeMs\` int,
                \`scheduledAt\` datetime(6) NOT NULL,
                \`workspaceId\` varchar(255) NOT NULL,
                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
        `)

        await queryRunner.query(
            `CREATE INDEX \`IDX_schedule_trigger_log_scheduleRecordId\` ON \`schedule_trigger_log\` (\`scheduleRecordId\`);`
        )
        await queryRunner.query(`CREATE INDEX \`IDX_schedule_trigger_log_targetId\` ON \`schedule_trigger_log\` (\`targetId\`);`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS \`schedule_trigger_log\``)
        await queryRunner.query(`DROP TABLE IF EXISTS \`schedule_record\``)
    }
}
