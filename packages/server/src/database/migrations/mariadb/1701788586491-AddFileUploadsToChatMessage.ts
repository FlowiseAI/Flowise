import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddFileUploadsToChatMessage1701788586491 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const columnExists = await queryRunner.hasColumn('chat_message', 'fileUploads')
        if (!columnExists) queryRunner.query(`ALTER TABLE \`chat_message\` ADD COLUMN \`fileUploads\` TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chat_message\` DROP COLUMN \`fileUploads\`;`)
    }
}
