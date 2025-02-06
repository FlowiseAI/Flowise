import { MigrationInterface, QueryRunner } from 'typeorm'

export class GroupNameForChatFlow1738844256157 implements MigrationInterface {
  name = 'GroupNameForChatFlow1738844256157'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('group_users')
    if (!tableExists) {
      await queryRunner.query(
        `CREATE TABLE "group_users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "groupname" character varying(255) NOT NULL, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_dff0a6c6586cd21b694266022fd" UNIQUE ("groupname"), CONSTRAINT "PK_5df8869cdeffc693bd083153bcf" PRIMARY KEY ("id"))`
      )
    }
    const indexExists = await queryRunner.query(`
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname = 'IDX_dff0a6c6586cd21b694266022f'
    `)
    if (!indexExists.length) {
      await queryRunner.query(`CREATE INDEX "IDX_dff0a6c6586cd21b694266022f" ON "group_users" ("groupname") `)
    }
    await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "welcomeMessage"`)
    await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "assistantAvatar"`)
    const userGroupnameExists = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='users' and column_name='groupname'
    `)
    if (!userGroupnameExists.length) {
      await queryRunner.query(`ALTER TABLE "users" ADD "groupname" character varying DEFAULT ''`)
    }
    await queryRunner.query(`ALTER TABLE "chat_flow" ADD "groupname" character varying DEFAULT ''`)
    await queryRunner.query(`ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`)
    await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('MASTER_ADMIN', 'ADMIN', 'USER')`)
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`)
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::"text"::"public"."users_role_enum"`
    )
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'USER'`)
    await queryRunner.query(`DROP TYPE "public"."users_role_enum_old"`)
    await queryRunner.query(`UPDATE "users" SET "groupname" = (SELECT "groupname" FROM "group_users" LIMIT 1) WHERE "groupname" = ''`)
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_a6d948d4851cbb3cc68c67247ad" FOREIGN KEY ("groupname") REFERENCES "group_users"("groupname") ON DELETE CASCADE ON UPDATE NO ACTION`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_a6d948d4851cbb3cc68c67247ad"`)
    await queryRunner.query(`CREATE TYPE "public"."users_role_enum_old" AS ENUM('STOCK', 'UNI', 'ADMIN')`)
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`)
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum_old" USING "role"::"text"::"public"."users_role_enum_old"`
    )
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'ADMIN'`)
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`)
    await queryRunner.query(`ALTER TYPE "public"."users_role_enum_old" RENAME TO "users_role_enum"`)
    await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "groupname"`)
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "groupname"`)
    await queryRunner.query(`ALTER TABLE "chat_flow" ADD "assistantAvatar" text`)
    await queryRunner.query(`ALTER TABLE "chat_flow" ADD "welcomeMessage" text`)
    await queryRunner.query(`DROP INDEX "public"."IDX_dff0a6c6586cd21b694266022f"`)
    await queryRunner.query(`DROP TABLE "group_users"`)
  }
}
