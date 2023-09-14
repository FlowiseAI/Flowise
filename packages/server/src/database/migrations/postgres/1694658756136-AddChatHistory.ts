import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddChatHistory1694658756136 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "chat_message" ADD COLUMN IF NOT EXISTS "chatType" VARCHAR NOT NULL DEFAULT 'INTERNAL', ADD COLUMN IF NOT EXISTS "memoryType" VARCHAR, ADD COLUMN IF NOT EXISTS "sessionId" VARCHAR;`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "chatType", DROP COLUMN "memoryType", DROP COLUMN "sessionId";`)
    }
}
