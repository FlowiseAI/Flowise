import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddWebhookSecretToChatFlow1776240000001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" ADD COLUMN IF NOT EXISTS "webhookSecret" TEXT;`)
        await queryRunner.query(`ALTER TABLE "chat_flow" ADD COLUMN IF NOT EXISTS "webhookSecretConfigured" BOOLEAN DEFAULT FALSE;`)
        await queryRunner.query(`UPDATE "chat_flow" SET "webhookSecretConfigured" = TRUE WHERE "webhookSecret" IS NOT NULL;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "webhookSecretConfigured";`)
        await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "webhookSecret";`)
    }
}
