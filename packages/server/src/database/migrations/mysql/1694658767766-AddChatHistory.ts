import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddChatHistory1694658767766 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const chatTypeColumnExists = await queryRunner.hasColumn('chat_message', 'chatType')
        if (!chatTypeColumnExists)
            await queryRunner.query(`ALTER TABLE \`chat_message\` ADD COLUMN \`chatType\` VARCHAR(255) NOT NULL DEFAULT 'INTERNAL';`)

        const chatIdColumnExists = await queryRunner.hasColumn('chat_message', 'chatId')
        if (!chatIdColumnExists) await queryRunner.query(`ALTER TABLE \`chat_message\` ADD COLUMN \`chatId\` VARCHAR(255);`)
        const results: { id: string; chatflowid: string }[] = await queryRunner.query(`WITH RankedMessages AS (
                SELECT
                    \`chatflowid\`,
                    \`id\`,
                    \`createdDate\`,
                    ROW_NUMBER() OVER (PARTITION BY \`chatflowid\` ORDER BY \`createdDate\`) AS row_num
                FROM \`chat_message\`
            )
            SELECT \`chatflowid\`, \`id\`
            FROM RankedMessages
            WHERE row_num = 1;`)
        for (const chatMessage of results) {
            await queryRunner.query(
                `UPDATE \`chat_message\` SET \`chatId\` = '${chatMessage.id}' WHERE \`chatflowid\` = '${chatMessage.chatflowid}'`
            )
        }
        await queryRunner.query(`ALTER TABLE \`chat_message\` MODIFY \`chatId\` VARCHAR(255) NOT NULL;`)

        const memoryTypeColumnExists = await queryRunner.hasColumn('chat_message', 'memoryType')
        if (!memoryTypeColumnExists) await queryRunner.query(`ALTER TABLE \`chat_message\` ADD COLUMN \`memoryType\` VARCHAR(255);`)

        const sessionIdColumnExists = await queryRunner.hasColumn('chat_message', 'sessionId')
        if (!sessionIdColumnExists) await queryRunner.query(`ALTER TABLE \`chat_message\` ADD COLUMN \`sessionId\` VARCHAR(255);`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`chat_message\` DROP COLUMN \`chatType\`, DROP COLUMN \`chatId\`, DROP COLUMN \`memoryType\`, DROP COLUMN \`sessionId\`;`
        )
    }
}
