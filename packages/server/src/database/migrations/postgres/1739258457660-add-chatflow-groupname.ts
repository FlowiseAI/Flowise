import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddChatflowGroupname1739258457660 implements MigrationInterface {
  name = 'AddChatflowGroupname1739258457660'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chat_flow" ADD "groupname" character varying DEFAULT ''`)
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'USER'`)
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_a6d948d4851cbb3cc68c67247ad" FOREIGN KEY ("groupname") REFERENCES "group_users"("groupname") ON DELETE CASCADE ON UPDATE NO ACTION`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_a6d948d4851cbb3cc68c67247ad"`)
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'ADMIN'`)
    await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "groupname"`)
  }
}
