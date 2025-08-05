import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddFlowHistoryEntity1750000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "flow_history" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "entityType" varchar(20) NOT NULL,
                "entityId" uuid NOT NULL,
                "snapshotData" text NOT NULL,
                "changeDescription" text DEFAULT NULL,
                "version" integer NOT NULL,
                "createdDate" timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "workspaceId" text DEFAULT NULL,
                CONSTRAINT "PK_flow_history_id" PRIMARY KEY ("id")
            );`
        )

        await queryRunner.query(`CREATE INDEX "IDX_flow_history_entity_version" ON "flow_history" ("entityType", "entityId", "version");`)

        await queryRunner.query(`CREATE INDEX "IDX_flow_history_entity_date" ON "flow_history" ("entityType", "entityId", "createdDate");`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "flow_history"`)
    }
}
