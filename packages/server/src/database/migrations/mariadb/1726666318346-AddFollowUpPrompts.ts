import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddFollowUpPrompts1726666318346 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const columnExistsInChatflow = await queryRunner.hasColumn('chat_flow', 'followUpPrompts')
        if (!columnExistsInChatflow) queryRunner.query(`ALTER TABLE \`chat_flow\` ADD COLUMN \`followUpPrompts\` TEXT;`)
        const columnExistsInChatMessage = await queryRunner.hasColumn('chat_message', 'followUpPrompts')
        if (!columnExistsInChatMessage) queryRunner.query(`ALTER TABLE \`chat_message\` ADD COLUMN \`followUpPrompts\` TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chat_flow\` DROP COLUMN \`followUpPrompts\`;`)
        await queryRunner.query(`ALTER TABLE \`chat_message\` DROP COLUMN \`followUpPrompts\`;`)
    }
}
