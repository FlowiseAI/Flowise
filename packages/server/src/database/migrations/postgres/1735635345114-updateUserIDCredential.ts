import { MigrationInterface, QueryRunner } from 'typeorm'

export class UpdateUserIDCredential1735635345114 implements MigrationInterface {
  name = 'UpdateUserIDCredential1735635345114'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "credential" ADD "userId" uuid`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "credential" DROP COLUMN "userId"`)
  }
}
