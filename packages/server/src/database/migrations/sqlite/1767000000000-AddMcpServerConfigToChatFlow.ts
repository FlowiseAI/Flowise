import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddMcpServerConfigToChatFlow1767000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" ADD COLUMN "mcpServerConfig" TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "mcpServerConfig";`)
    }
}
