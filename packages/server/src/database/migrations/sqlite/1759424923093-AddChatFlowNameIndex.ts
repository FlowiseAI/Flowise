import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddChatFlowNameIndex1759424923093 implements MigrationInterface {
    name = 'AddChatFlowNameIndex1759424923093'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_chatflow_name" ON "chat_flow" (substr(name, 1, 255))`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chatflow_name"`)
    }
}
