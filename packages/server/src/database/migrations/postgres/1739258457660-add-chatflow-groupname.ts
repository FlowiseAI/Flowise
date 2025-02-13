import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddChatFlowGroupName1739258457660 implements MigrationInterface {
  name = 'AddChatFlowGroupName1739258457660'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('chat_flow')
    const column = table?.findColumnByName('groupname')
    if (!column) {
      await queryRunner.query(`ALTER TABLE "chat_flow" ADD "groupname" character varying DEFAULT ''`)
    }
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'USER'`)
    const constraint = await queryRunner.query(`SELECT conname FROM pg_constraint WHERE conname = 'FK_a6d948d4851cbb3cc68c67247ad'`)
    if (constraint.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD CONSTRAINT "FK_a6d948d4851cbb3cc68c67247ad" FOREIGN KEY ("groupname") REFERENCES "group_users"("groupname") ON DELETE CASCADE ON UPDATE NO ACTION`
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_a6d948d4851cbb3cc68c67247ad"`)
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'ADMIN'`)
    await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "groupname"`)
  }
}
