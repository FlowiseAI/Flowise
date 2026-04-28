import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUpsertHistoryEntity1709814301358 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "upsert_history" ("id" varchar PRIMARY KEY NOT NULL, "chatflowid" varchar NOT NULL, "result" text NOT NULL, "flowData" text NOT NULL, "date" datetime NOT NULL DEFAULT (datetime('now')));`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE upsert_history`)
    }
}
