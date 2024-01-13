import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddVariableEntity1699325775451 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "variable" ("id" varchar PRIMARY KEY NOT NULL, "name" text NOT NULL, "value" text NOT NULL, "type" varchar, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "updatedDate" datetime NOT NULL DEFAULT (datetime('now')));`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE variable`)
    }
}
