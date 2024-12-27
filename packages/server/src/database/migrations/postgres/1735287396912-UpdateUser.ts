import { MigrationInterface, QueryRunner } from 'typeorm'

export class UpdateUser1735287396912 implements MigrationInterface {
  name = 'UpdateUser1735287396912'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "displayPrefixes" character varying`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "displayPrefixes"`)
  }
}
