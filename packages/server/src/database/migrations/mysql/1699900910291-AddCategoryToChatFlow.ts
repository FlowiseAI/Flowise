import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCategoryToChatFlow1699900910291 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const columnExists = await queryRunner.hasColumn('chat_flow', 'category')
        if (!columnExists) queryRunner.query(`ALTER TABLE \`chat_flow\` ADD COLUMN \`category\` TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chat_flow\` DROP COLUMN \`category\`;`)
    }
}
