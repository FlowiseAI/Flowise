import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddLead1710832117612 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "lead" ("id" varchar PRIMARY KEY NOT NULL, "chatflowid" varchar NOT NULL, "chatId" varchar NOT NULL, "name" text, "email" text, "phone" text, "createdDate" datetime NOT NULL DEFAULT (datetime('now')));`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "lead";`)
    }
}
