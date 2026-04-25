import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSkillEntity1770000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "skill" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar NOT NULL,
                "description" text NOT NULL,
                "markdown" text NOT NULL,
                "inputSchema" text,
                "color" varchar,
                "iconSrc" varchar,
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')),
                "workspaceId" text NOT NULL
            );`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE skill`)
    }
}
