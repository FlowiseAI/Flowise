import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSkillEntity1770000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS skill (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" varchar NOT NULL,
                "description" text NOT NULL,
                "markdown" text NOT NULL,
                "inputSchema" text NULL,
                "color" varchar NULL,
                "iconSrc" varchar NULL,
                "createdDate" timestamp NOT NULL DEFAULT now(),
                "updatedDate" timestamp NOT NULL DEFAULT now(),
                "workspaceId" text NOT NULL,
                CONSTRAINT "PK_skill_id" PRIMARY KEY (id)
            );`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE skill`)
    }
}
