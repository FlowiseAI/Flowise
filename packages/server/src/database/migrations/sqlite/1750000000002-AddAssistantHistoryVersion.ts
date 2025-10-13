import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAssistantHistoryVersion1750000000002 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "assistant" ADD "currentHistoryVersion" integer`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "assistant" DROP COLUMN "currentHistoryVersion"`)
    }
}
