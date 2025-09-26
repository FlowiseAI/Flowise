import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddChatFlowNameIndex1755748356008 implements MigrationInterface {
    name = 'AddChatFlowNameIndex1755748356008'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX \`IDX_chatflow_name\` ON \`chat_flow\` (LEFT(\`name\`, 255))`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_chatflow_name\` ON \`chat_flow\``)
    }
}
