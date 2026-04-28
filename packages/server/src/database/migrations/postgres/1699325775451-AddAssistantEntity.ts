import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAssistantEntity1699325775451 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS assistant (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "credential" varchar NOT NULL,
                "details" text NOT NULL,
                "iconSrc" varchar NULL,
                "createdDate" timestamp NOT NULL DEFAULT now(),
                "updatedDate" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_3c7cea7a044ac4c92764576cdbf" PRIMARY KEY (id)
            );`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE assistant`)
    }
}
