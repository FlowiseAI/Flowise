import { MigrationInterface, QueryRunner } from 'typeorm'

export class UserGroup1737531084639 implements MigrationInterface {
  name = 'UserGroup1737531084639'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "groupname" character varying DEFAULT ''`)
    await queryRunner.query(`ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`)
    await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('MASTER_ADMIN', 'ADMIN', 'USER')`)
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`)
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::"text"::"public"."users_role_enum"`
    )
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'ADMIN'`)
    await queryRunner.query(`DROP TYPE "public"."users_role_enum_old"`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."users_role_enum_old" AS ENUM('STOCK', 'UNI', 'ADMIN')`)
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`)
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum_old" USING "role"::"text"::"public"."users_role_enum_old"`
    )
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'ADMIN'`)
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`)
    await queryRunner.query(`ALTER TYPE "public"."users_role_enum_old" RENAME TO "users_role_enum"`)
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "groupname"`)
  }
}
