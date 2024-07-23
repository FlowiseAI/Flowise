import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddActionToChatMessage1721078251523 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const columnExists = await queryRunner.hasColumn('chat_message', 'action')
        if (!columnExists) queryRunner.query(`ALTER TABLE \`chat_message\` ADD COLUMN \`action\` LONGTEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chat_message\` DROP COLUMN \`action\`;`)
    }
}
