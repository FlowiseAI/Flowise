import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddTypeToChatFlow1766759476232 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" ADD COLUMN IF NOT EXISTS "type" TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "type";`)
    }
}
