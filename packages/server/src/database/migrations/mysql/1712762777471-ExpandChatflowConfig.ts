import { MigrationInterface, QueryRunner } from 'typeorm'

export class ExpandChatFlowConfig1712762777471 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chat_flow\` MODIFY \`chatbotConfig\` LONGTEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chat_flow\` MODIFY \`chatbotConfig\` TEXT;`)
    }
}
