import { MigrationInterface, QueryRunner } from 'typeorm'

export class ModifyChatFlow1693997791471 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chat_flow\` MODIFY \`chatbotConfig\` TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chat_flow\` MODIFY \`chatbotConfig\` VARCHAR;`)
    }
}
