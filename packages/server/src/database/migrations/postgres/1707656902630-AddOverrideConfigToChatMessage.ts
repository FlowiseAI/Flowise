import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddOverrideConfigToChatMessage1707656902630 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_message" ADD COLUMN IF NOT EXISTS "overrideConfig" TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "overrideConfig";`)
    }
}
