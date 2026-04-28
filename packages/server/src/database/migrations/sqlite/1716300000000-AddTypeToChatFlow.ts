import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddTypeToChatFlow1716300000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const columnExists = await queryRunner.hasColumn('chat_flow', 'type')
        if (!columnExists) await queryRunner.query(`ALTER TABLE "chat_flow"ADD COLUMN "type" TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "type";`)
    }
}
