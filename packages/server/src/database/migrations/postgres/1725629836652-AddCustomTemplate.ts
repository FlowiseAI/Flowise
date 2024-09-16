import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCustomTemplate1725629836652 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS custom_template (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" varchar NOT NULL,
                "flowData" text NOT NULL,
                "description" varchar NULL,
                "badge" varchar NULL,
                "framework" varchar NULL,
                "usecases" varchar NULL,
                "type" varchar NULL,
                "createdDate" timestamp NOT NULL DEFAULT now(),
                "updatedDate" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_3c7cea7d087ac4b91764574cdbf" PRIMARY KEY (id)
            );`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE custom_template`)
    }
}
