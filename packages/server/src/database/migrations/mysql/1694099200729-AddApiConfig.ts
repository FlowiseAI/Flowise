import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddApiConfig1694099200729 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const columnExists = await queryRunner.hasColumn('chat_flow', 'apiConfig')
        if (!columnExists) queryRunner.query(`ALTER TABLE \`chat_flow\` ADD COLUMN \`apiConfig\` TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chat_flow\` DROP COLUMN \`apiConfig\`;`)
    }
}
