import { MigrationInterface, QueryRunner } from 'typeorm'

export class UpdateUserIDChatFlow1735802580229 implements MigrationInterface {
  name = 'UpdateUserIDChatFlow1735802580229'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chat_flow" RENAME COLUMN "userid" TO "userId"`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chat_flow" RENAME COLUMN "userId" TO "userid"`)
  }
}
