import { MigrationInterface, QueryRunner } from 'typeorm'
import { EnumChatflowType } from '../../entities/ChatFlow'

export class ModifyChatflowType1755066758601 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "chat_flow" SET "type" = '${EnumChatflowType.CHATFLOW}' WHERE "type" IS NULL OR "type" = '';
        `)
        await queryRunner.query(`
            ALTER TABLE "chat_flow" ALTER COLUMN "type" SET DEFAULT '${EnumChatflowType.CHATFLOW}';
        `)
        await queryRunner.query(`
            ALTER TABLE "chat_flow" ALTER COLUMN "type" TYPE VARCHAR(20);
        `)
        await queryRunner.query(`
            ALTER TABLE "chat_flow" ALTER COLUMN "type" SET NOT NULL;
        `)
    }

    public async down(): Promise<void> {}
}
