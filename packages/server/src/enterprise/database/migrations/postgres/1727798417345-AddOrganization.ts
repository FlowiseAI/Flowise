import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddOrganization1727798417345 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS organization (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" varchar NOT NULL,
                "adminUserId" varchar NULL,
                "defaultWsId" varchar NULL,
                "organization_type" varchar NULL,
                "createdDate" timestamp NOT NULL DEFAULT now(),
                "updatedDate" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_99619041dd804f00-9830ab99f8" PRIMARY KEY (id)
            );`
        )
        await queryRunner.query(`ALTER TABLE "workspace" ADD COLUMN IF NOT EXISTS "organizationId" varchar;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE organization`)

        await queryRunner.query(`ALTER TABLE "workspace" DROP COLUMN "organizationId";`)
    }
}
