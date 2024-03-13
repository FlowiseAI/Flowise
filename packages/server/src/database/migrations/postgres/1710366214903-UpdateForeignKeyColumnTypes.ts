import { MigrationInterface, QueryRunner } from 'typeorm'

export class UpdateForeignKeyColumnTypes1710366214903 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE chat_message_feedback ALTER COLUMN "chatflowid" TYPE uuid USING "chatflowid"::uuid;`)
        await queryRunner.query(`ALTER TABLE chat_message_feedback ALTER COLUMN "chatId" TYPE uuid USING "chatId"::uuid;`)
        await queryRunner.query(`ALTER TABLE chat_message_feedback ALTER COLUMN "messageId" TYPE uuid USING "messageId"::uuid;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Convert back to varchar if necessary, noting that you'll lose strict type enforcement
        await queryRunner.query(`ALTER TABLE chat_message_feedback ALTER COLUMN "chatflowid" TYPE varchar;`)
        await queryRunner.query(`ALTER TABLE chat_message_feedback ALTER COLUMN "chatId" TYPE varchar;`)
        await queryRunner.query(`ALTER TABLE chat_message_feedback ALTER COLUMN "messageId" TYPE varchar;`)
    }
}
