import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCustomTemplate1725629836652 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "custom_template" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "name" varchar NOT NULL, 
                "flowData" text NOT NULL, 
                "description" varchar, 
                "badge" varchar, 
                "framework" varchar, 
                "usecases" varchar, 
                "type" varchar, 
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')),
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')));`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "custom_template";`)
    }
}
