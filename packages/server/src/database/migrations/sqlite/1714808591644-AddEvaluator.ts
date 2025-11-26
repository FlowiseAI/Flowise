import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddEvaluator1714808591644 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "evaluator" ("id" varchar PRIMARY KEY NOT NULL, 
"name" text NOT NULL, 
"type" varchar, 
"config" text, 
"createdDate" datetime NOT NULL DEFAULT (datetime('now')), 
"updatedDate" datetime NOT NULL DEFAULT (datetime('now')));`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE evaluator`)
    }
}
