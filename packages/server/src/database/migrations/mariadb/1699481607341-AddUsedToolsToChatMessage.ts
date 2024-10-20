import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUsedToolsToChatMessage1699481607341 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const columnExists = await queryRunner.hasColumn('chat_message', 'usedTools')
        if (!columnExists) queryRunner.query(`ALTER TABLE \`chat_message\` ADD COLUMN \`usedTools\` TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chat_message\` DROP COLUMN \`usedTools\`;`)
    }
}
