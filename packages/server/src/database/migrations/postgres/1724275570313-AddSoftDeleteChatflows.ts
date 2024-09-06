import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSoftDeleteChatflows1724275570313 implements MigrationInterface {
    name = 'AddSoftDeleteChatflows1724275570313'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" ADD "deletedDate" TIMESTAMP`)
        await queryRunner.query(`ALTER TABLE "chat_message" ADD "deletedDate" TIMESTAMP`)
        await queryRunner.query(`ALTER TABLE "chat_message_feedback" ADD "deletedDate" TIMESTAMP`)
        await queryRunner.query(`ALTER TABLE "upsert_history" ADD "deletedDate" TIMESTAMP`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "upsert_history" DROP COLUMN "deletedDate"`)
        await queryRunner.query(`ALTER TABLE "chat_message_feedback" DROP COLUMN "deletedDate"`)
        await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "deletedDate"`)
        await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "deletedDate"`)
    }
}
