import { MigrationInterface, QueryRunner } from 'typeorm'

export class UpdateUserIDApiKey1735786578649 implements MigrationInterface {
  name = 'UpdateUserIDApiKey1735786578649'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "apikey" ADD "userId" uuid`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "apikey" DROP COLUMN "userId"`)
  }
}
