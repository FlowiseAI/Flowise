import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddFlowHistoryEntity1750000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "flow_history" (
                "id" varchar PRIMARY KEY NOT NULL,
                "entityType" varchar(20) NOT NULL,
                "entityId" varchar NOT NULL,
                "snapshotData" text NOT NULL,
                "version" integer NOT NULL,
                "changeDescription" text,
                "workspaceId" varchar,
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now'))
            );`
        )

        // Create indexes for better query performance
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_flow_history_entity_version" ON "flow_history" ("entityType", "entityId", "version");`
        )

        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_flow_history_entity_date" ON "flow_history" ("entityType", "entityId", "createdDate");`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_flow_history_entity_date"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_flow_history_entity_version"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "flow_history"`)
    }
}
