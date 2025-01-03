import { MigrationInterface, QueryRunner } from 'typeorm'

export class UpdateUserIDVariable1735641924580 implements MigrationInterface {
  name = 'UpdateUserIDVariable1735641924580'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "variable" ADD "userId" uuid`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "variable" DROP COLUMN "userId"`)
  }
}
