import { MigrationInterface, QueryRunner } from 'typeorm'

export class UserGroup1738567879827 implements MigrationInterface {
  name = 'UserGroup1738567879827'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "group_users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "groupname" character varying(255) NOT NULL, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_dff0a6c6586cd21b694266022fd" UNIQUE ("groupname"), CONSTRAINT "PK_5df8869cdeffc693bd083153bcf" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(`CREATE INDEX "IDX_dff0a6c6586cd21b694266022f" ON "group_users" ("groupname") `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_dff0a6c6586cd21b694266022f"`)
    await queryRunner.query(`DROP TABLE "group_users"`)
  }
}
