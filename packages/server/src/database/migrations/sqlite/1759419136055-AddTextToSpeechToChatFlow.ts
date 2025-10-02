import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddTextToSpeechToChatFlow1759419136055 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const tableInfo = await queryRunner.query(`PRAGMA table_info("chat_flow");`)
        const columnExists = tableInfo.some((column: any) => column.name === 'textToSpeech')
        if (!columnExists) {
            await queryRunner.query(`ALTER TABLE "chat_flow" ADD COLUMN "textToSpeech" TEXT;`)
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "textToSpeech";`)
    }
}
