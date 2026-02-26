import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddReasonContentToChatMessage1764759496768 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_message" ADD COLUMN "reasonContent" TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "reasonContent";`)
    }
}
