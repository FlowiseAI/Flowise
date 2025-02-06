import { MigrationInterface, QueryRunner } from 'typeorm'

export class GroupnameForChatflow1738829956864 implements MigrationInterface {
  name = 'GroupnameForChatflow1738829956864'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chat_flow" ADD "groupname" character varying DEFAULT ''`)
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'USER'`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'ADMIN'`)
    await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "groupname"`)
  }
}
