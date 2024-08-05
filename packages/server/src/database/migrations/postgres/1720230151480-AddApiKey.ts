import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddApiKey1720230151480 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS apikey (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "apiKey" varchar NOT NULL,
                "apiSecret" varchar NOT NULL,
                "keyName" varchar NOT NULL,
                "updatedDate" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_96109043dd704f53-9830ab78f0" PRIMARY KEY (id)
            );`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE apikey`)
    }
}
