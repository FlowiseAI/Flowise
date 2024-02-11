import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddOverrideConfigToChatMessage1707656902630 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('hey');
        const columnExists = await queryRunner.hasColumn('chat_message', 'overrideConfig')
        if (!columnExists) queryRunner.query(`ALTER TABLE \`chat_message\` ADD COLUMN \`overrideConfig\` TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chat_message\` DROP COLUMN \`overrideConfig\`;`)
    }
}
