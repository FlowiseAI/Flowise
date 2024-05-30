import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAgentReasoningToChatMessage1714679514451 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_message" ADD COLUMN IF NOT EXISTS "agentReasoning" TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "agentReasoning";`)
    }
}
