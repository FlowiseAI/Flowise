import { MigrationInterface, QueryRunner } from 'typeorm'

export class UpdateUserIDToll1735629996883 implements MigrationInterface {
  name = 'UpdateUserIDToll1735629996883'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tool" ADD "userId" uuid`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tool" DROP COLUMN "userId"`)
  }
}
