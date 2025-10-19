import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddTextToSpeechToChatFlow1754986480347 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" ADD COLUMN IF NOT EXISTS "textToSpeech" TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "textToSpeech";`)
    }
}
