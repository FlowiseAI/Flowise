import { MigrationInterface, QueryRunner } from 'typeorm'

export class FieldTypes1710497452584 implements MigrationInterface {
    name = 'FieldTypes1710497452584'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_message" ALTER COLUMN "chatflowid" type uuid USING "chatflowid"::uuid`)
        await queryRunner.query(`ALTER TABLE "chat_message" ALTER COLUMN "chatId" type varchar USING "chatId"::varchar`)
        await queryRunner.query(`ALTER TABLE "chat_message" ALTER COLUMN "sessionId" type varchar USING "sessionId"::varchar`)

        await queryRunner.query(`ALTER TABLE "assistant" ALTER COLUMN "credential" type uuid USING "credential"::uuid`)

        await queryRunner.query(`ALTER TABLE "chat_message_feedback" ALTER COLUMN "chatflowid" type uuid USING "chatflowid"::uuid`)
        await queryRunner.query(`ALTER TABLE "chat_message_feedback" ALTER COLUMN "chatId" type varchar USING "chatId"::varchar`)
        await queryRunner.query(`ALTER TABLE "chat_message_feedback" ALTER COLUMN "messageId" type uuid USING "messageId"::uuid`)

        await queryRunner.query(`ALTER TABLE "chat_message_feedback" ADD CONSTRAINT "UQ_6352078b5a294f2d22179ea7956" UNIQUE ("messageId")`)

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_f56c36fe42894d57e5c664d229" ON "chat_message" ("chatflowid") `)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_f56c36fe42894d57e5c664d230" ON "chat_message_feedback" ("chatflowid") `)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_9acddcb7a2b51fe37669049fc6" ON "chat_message_feedback" ("chatId") `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_9acddcb7a2b51fe37669049fc6"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_f56c36fe42894d57e5c664d229"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_f56c36fe42894d57e5c664d230"`)

        await queryRunner.query(`ALTER TABLE "chat_message_feedback" DROP CONSTRAINT "UQ_6352078b5a294f2d22179ea7956"`)

        await queryRunner.query(`ALTER TABLE "chat_message" ALTER COLUMN "chatflowid" type varchar USING "chatflowid"::varchar`)
        await queryRunner.query(`ALTER TABLE "chat_message" ALTER COLUMN "chatId" type varchar USING "chatId"::varchar`)
        await queryRunner.query(`ALTER TABLE "chat_message" ALTER COLUMN "sessionId" type varchar USING "sessionId"::varchar`)

        await queryRunner.query(`ALTER TABLE "assistant" ALTER COLUMN "credential" type varchar USING "credential"::varchar`)

        await queryRunner.query(`ALTER TABLE "chat_message_feedback" ALTER COLUMN "chatflowid" type varchar USING "chatflowid"::varchar`)
        await queryRunner.query(`ALTER TABLE "chat_message_feedback" ALTER COLUMN "chatId" type varchar USING "chatId"::varchar`)
        await queryRunner.query(`ALTER TABLE "chat_message_feedback" ALTER COLUMN "messageId" type varchar USING "messageId"::varchar`)
    }
}
