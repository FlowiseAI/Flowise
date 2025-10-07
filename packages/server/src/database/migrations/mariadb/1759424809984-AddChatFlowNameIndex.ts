import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddChatFlowNameIndex1759424809984 implements MigrationInterface {
    name = 'AddChatFlowNameIndex1759424809984'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX \`IDX_chatflow_name\` ON \`chat_flow\` (\`name\`(191))`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_chatflow_name\` ON \`chat_flow\``)
    }
}
