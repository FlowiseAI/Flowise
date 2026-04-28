import { MigrationInterface, QueryRunner } from 'typeorm'

export class ModifyChatMessage1693999022236 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chat_message\` MODIFY \`sourceDocuments\` TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chat_message\` MODIFY \`sourceDocuments\` VARCHAR;`)
    }
}
