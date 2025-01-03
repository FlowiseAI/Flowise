import { MigrationInterface, QueryRunner } from 'typeorm'

export class UpdateUserIDCustomTemplate1735620703270 implements MigrationInterface {
  name = 'UpdateUserIDCustomTemplate1735620703270'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "custom_template" ADD "userId" uuid`)
    await queryRunner.query(`ALTER TABLE "custom_template" DROP COLUMN "description"`)
    await queryRunner.query(`ALTER TABLE "custom_template" ADD "description" text`)
    await queryRunner.query(`ALTER TABLE "custom_template" DROP COLUMN "badge"`)
    await queryRunner.query(`ALTER TABLE "custom_template" ADD "badge" text`)
    await queryRunner.query(`ALTER TABLE "custom_template" DROP COLUMN "framework"`)
    await queryRunner.query(`ALTER TABLE "custom_template" ADD "framework" text`)
    await queryRunner.query(`ALTER TABLE "custom_template" DROP COLUMN "usecases"`)
    await queryRunner.query(`ALTER TABLE "custom_template" ADD "usecases" text`)
    await queryRunner.query(`ALTER TABLE "custom_template" DROP COLUMN "type"`)
    await queryRunner.query(`ALTER TABLE "custom_template" ADD "type" text`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "custom_template" DROP COLUMN "type"`)
    await queryRunner.query(`ALTER TABLE "custom_template" ADD "type" character varying`)
    await queryRunner.query(`ALTER TABLE "custom_template" DROP COLUMN "usecases"`)
    await queryRunner.query(`ALTER TABLE "custom_template" ADD "usecases" character varying`)
    await queryRunner.query(`ALTER TABLE "custom_template" DROP COLUMN "framework"`)
    await queryRunner.query(`ALTER TABLE "custom_template" ADD "framework" character varying`)
    await queryRunner.query(`ALTER TABLE "custom_template" DROP COLUMN "badge"`)
    await queryRunner.query(`ALTER TABLE "custom_template" ADD "badge" character varying`)
    await queryRunner.query(`ALTER TABLE "custom_template" DROP COLUMN "description"`)
    await queryRunner.query(`ALTER TABLE "custom_template" ADD "description" character varying`)
    await queryRunner.query(`ALTER TABLE "custom_template" DROP COLUMN "userId"`)
  }
}
