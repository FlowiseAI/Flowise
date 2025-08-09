import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSettingsToCustomTemplate1752780175001 implements MigrationInterface {
    name = 'AddSettingsToCustomTemplate1752780175001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "custom_template" ADD "chatbotConfig" text`)
        await queryRunner.query(`ALTER TABLE "custom_template" ADD "visibility" text[]`)
        await queryRunner.query(`ALTER TABLE "custom_template" ADD "apiConfig" text`)
        await queryRunner.query(`ALTER TABLE "custom_template" ADD "speechToText" text`)
        await queryRunner.query(`ALTER TABLE "custom_template" ADD "category" text`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "custom_template" DROP COLUMN "chatbotConfig"`)
        await queryRunner.query(`ALTER TABLE "custom_template" DROP COLUMN "visibility"`)
        await queryRunner.query(`ALTER TABLE "custom_template" DROP COLUMN "apiConfig"`)
        await queryRunner.query(`ALTER TABLE "custom_template" DROP COLUMN "speechToText"`)
        await queryRunner.query(`ALTER TABLE "custom_template" DROP COLUMN "category"`)
    }
}
