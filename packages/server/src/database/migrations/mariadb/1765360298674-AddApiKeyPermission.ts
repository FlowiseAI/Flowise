import { MigrationInterface, QueryRunner } from 'typeorm'
import { hasColumn } from '../../../utils/database.util'

export class AddApiKeyPermission1765360298674 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const tableName = 'apikey'
        const columnName = 'permissions'

        const columnExists = await hasColumn(queryRunner, tableName, columnName)
        if (!columnExists) {
            await queryRunner.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` TEXT NOT NULL DEFAULT ('[]');`)

            const permission =
                '["chatflows:view","chatflows:create","chatflows:update","chatflows:duplicate","chatflows:delete","chatflows:export","chatflows:import","chatflows:config","chatflows:domains","agentflows:view","agentflows:create","agentflows:update","agentflows:duplicate","agentflows:delete","agentflows:export","agentflows:import","agentflows:config","agentflows:domains","tools:view","tools:create","tools:update","tools:delete","tools:export","assistants:view","assistants:create","assistants:update","assistants:delete","credentials:view","credentials:create","credentials:update","credentials:delete","credentials:share","variables:view","variables:create","variables:update","variables:delete","apikeys:view","apikeys:create","apikeys:update","apikeys:delete","apikeys:import","documentStores:view","documentStores:create","documentStores:update","documentStores:delete","documentStores:add-loader","documentStores:delete-loader","documentStores:preview-process","documentStores:upsert-config","datasets:view","datasets:create","datasets:update","datasets:delete","executions:view","executions:delete","evaluators:view","evaluators:create","evaluators:update","evaluators:delete","evaluations:view","evaluations:create","evaluations:update","evaluations:delete","evaluations:run","templates:marketplace","templates:custom","templates:custom-delete","templates:toolexport","templates:flowexport","templates:custom-share","workspace:view","workspace:create","workspace:update","workspace:add-user","workspace:unlink-user","workspace:delete","workspace:export","workspace:import","users:manage","roles:manage",null,"admin:view"]'

            await queryRunner.query(`UPDATE \`${tableName}\` SET \`${columnName}\` = '${permission}';`)
        }
    }

    public async down(): Promise<void> {}
}
