import { MigrationInterface, QueryRunner } from 'typeorm'

export class ModifyChatFlow1693995626941 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" ALTER COLUMN "chatbotConfig" TYPE TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" ALTER COLUMN "chatbotConfig" TYPE VARCHAR;`)
    }
}
