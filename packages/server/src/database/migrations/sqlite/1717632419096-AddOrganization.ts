import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddOrganization1717632419096 implements MigrationInterface {
    name = 'AddOrganization1717632419096'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "organization" ("id" TEXT NOT NULL, "auth0Id" TEXT NOT NULL, "name" TEXT, "createdDate" TEXT NOT NULL DEFAULT (datetime('now')), "updatedDate" TEXT NOT NULL DEFAULT (datetime('now')), CONSTRAINT "PK_472c1f99a32def1b0abb219cd67" PRIMARY KEY ("id"))`
        )
        await queryRunner.query(`CREATE INDEX "IDX_90d38ad6ba231f111f7127e425" ON "organization" ("auth0Id")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_90d38ad6ba231f111f7127e425"`)
        await queryRunner.query(`DROP TABLE "organization"`)
    }
}
