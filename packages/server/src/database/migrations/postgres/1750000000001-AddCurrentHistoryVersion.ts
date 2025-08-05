import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCurrentHistoryVersion1750000000001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" ADD "currentHistoryVersion" integer`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "currentHistoryVersion"`)
    }
}
