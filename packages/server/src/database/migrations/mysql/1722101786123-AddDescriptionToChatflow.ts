import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddDescriptionToChatFlow1722099922876 implements MigrationInterface {
    name = 'AddDescriptionToChatFlow1722099922876'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chat_flow\` ADD COLUMN \`description\` TEXT`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chat_flow\` DROP COLUMN \`description\``)
    }
}
