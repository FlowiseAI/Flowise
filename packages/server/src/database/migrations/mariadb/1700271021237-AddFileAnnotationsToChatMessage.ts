import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddFileAnnotationsToChatMessage1700271021237 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const columnExists = await queryRunner.hasColumn('chat_message', 'fileAnnotations')
        if (!columnExists) queryRunner.query(`ALTER TABLE \`chat_message\` ADD COLUMN \`fileAnnotations\` TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chat_message\` DROP COLUMN \`fileAnnotations\`;`)
    }
}
