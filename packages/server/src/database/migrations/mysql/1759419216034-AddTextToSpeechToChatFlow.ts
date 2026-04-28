import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddTextToSpeechToChatFlow1759419216034 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const columnExists = await queryRunner.hasColumn('chat_flow', 'textToSpeech')
        if (!columnExists) await queryRunner.query(`ALTER TABLE \`chat_flow\` ADD COLUMN \`textToSpeech\` TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chat_flow\` DROP COLUMN \`textToSpeech\`;`)
    }
}
