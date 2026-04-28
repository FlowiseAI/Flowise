import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddChatFlowNameIndex1759424903973 implements MigrationInterface {
    name = 'AddChatFlowNameIndex1759424903973'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_chatflow_name" ON "chat_flow" (substring("name" from 1 for 255))`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chatflow_name"`)
    }
}
