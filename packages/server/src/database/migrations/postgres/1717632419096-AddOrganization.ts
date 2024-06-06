import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddOrganization1717632419096 implements MigrationInterface {
    name = 'AddOrganization1717632419096'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "organization" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "auth0Id" character varying NOT NULL, "name" character varying, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_472c1f99a32def1b0abb219cd67" PRIMARY KEY ("id"))`
        )
        await queryRunner.query(`CREATE INDEX "IDX_90d38ad6ba231f111f7127e425" ON "organization" ("auth0Id") `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_90d38ad6ba231f111f7127e425"`)
        await queryRunner.query(`DROP TABLE "organization"`)
    }
}
