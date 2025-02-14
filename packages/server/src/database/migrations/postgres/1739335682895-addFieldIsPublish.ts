import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddFieldIsPublish1739335682895 implements MigrationInterface {
  name = 'AddFieldIsPublish1739335682895'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chat_flow" ADD "isPublish" boolean`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "isPublish"`)
  }
}
