import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddChatHistory1694658767766 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const chatTypeColumnExists = await queryRunner.hasColumn('chat_message', 'chatType')
        if (!chatTypeColumnExists)
            await queryRunner.query(`ALTER TABLE \`chat_message\` ADD COLUMN \`chatType\` VARCHAR(255) NOT NULL DEFAULT 'INTERNAL';`)
        const memoryTypeColumnExists = await queryRunner.hasColumn('chat_message', 'memoryType')
        if (!memoryTypeColumnExists) await queryRunner.query(`ALTER TABLE \`chat_message\` ADD COLUMN \`memoryType\` VARCHAR(255);`)
        const sessionIdColumnExists = await queryRunner.hasColumn('chat_message', 'sessionId')
        if (!sessionIdColumnExists) await queryRunner.query(`ALTER TABLE \`chat_message\` ADD COLUMN \`sessionId\` VARCHAR(255);`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`chat_message\` DROP COLUMN \`chatType\`, DROP COLUMN \`memoryType\`, DROP COLUMN \`sessionId\`;`
        )
    }
}
