import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddTrackingMetadataToChatMessage1753200000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_message" ADD COLUMN IF NOT EXISTS "tracking_metadata" TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "tracking_metadata";`)
    }
}
