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
        await queryRunner.query(`CREATE TABLE "chat_flow_temp" AS SELECT * FROM "chat_flow" WHERE 1=0;`)
        await queryRunner.query(`
            INSERT INTO "chat_flow_temp"
            SELECT id, name, flowData, deployed, isPublic, apikeyid, chatbotConfig, apiConfig, analytic, speechToText, followUpPrompts, category, type, createdDate, updatedDate, workspaceId
            FROM "chat_flow";
        `)
        await queryRunner.query(`DROP TABLE "chat_flow";`)
        await queryRunner.query(`ALTER TABLE "chat_flow_temp" RENAME TO "chat_flow";`)
    }
}
