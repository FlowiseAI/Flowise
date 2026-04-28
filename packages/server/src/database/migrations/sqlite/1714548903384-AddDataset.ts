import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddDatasets1714548903384 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "dataset" ("id" varchar PRIMARY KEY NOT NULL, 
                "name" text NOT NULL, 
                "description" varchar, 
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')));`
        )
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "dataset_row" ("id" varchar PRIMARY KEY NOT NULL, 
                "datasetId" text NOT NULL, 
                "input" text NOT NULL, 
                "output" text NOT NULL, 
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')));`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE dataset`)
        await queryRunner.query(`DROP TABLE dataset_row`)
    }
}
