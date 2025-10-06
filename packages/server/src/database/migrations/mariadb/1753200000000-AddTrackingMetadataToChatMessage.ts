import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddTrackingMetadataToChatMessage1753200000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const columnExists = await queryRunner.hasColumn('chat_message', 'tracking_metadata')
        if (!columnExists) await queryRunner.query(`ALTER TABLE \`chat_message\` ADD COLUMN \`tracking_metadata\` LONGTEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chat_message\` DROP COLUMN \`tracking_metadata\`;`)
    }
}
