import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAnalytic1694432361423 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const columnExists = await queryRunner.hasColumn('chat_flow', 'analytic')
        if (!columnExists) queryRunner.query(`ALTER TABLE \`chat_flow\` ADD COLUMN \`analytic\` TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chat_flow\` DROP COLUMN \`analytic\`;`)
    }
}
