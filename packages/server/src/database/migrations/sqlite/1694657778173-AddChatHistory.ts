import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddChatHistory1694657778173 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_message" ADD COLUMN "chatType" VARCHAR NOT NULL DEFAULT 'INTERNAL';`)
        await queryRunner.query(`ALTER TABLE "chat_message" ADD COLUMN "memoryType" VARCHAR;`)
        await queryRunner.query(`ALTER TABLE "chat_message" ADD COLUMN "sessionId" VARCHAR;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "chatType";`)
        await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "memoryType";`)
        await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "sessionId";`)
    }
}
