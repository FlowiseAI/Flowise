import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAssistantEntity1699325775451 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "assistant" ("id" varchar PRIMARY KEY NOT NULL, "details" text NOT NULL, "credential" varchar NOT NULL, "iconSrc" varchar, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "updatedDate" datetime NOT NULL DEFAULT (datetime('now')));`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE assistant`)
    }
}
