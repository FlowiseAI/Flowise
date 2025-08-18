import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddVersioningToChatFlow1753000000000 implements MigrationInterface {
    name = 'AddVersioningToChatFlow1753000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" ADD "currentVersion" integer DEFAULT 1`)
        await queryRunner.query(`ALTER TABLE "chat_flow" ADD "s3Location" text`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "s3Location"`)
        await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "currentVersion"`)
    }
}
