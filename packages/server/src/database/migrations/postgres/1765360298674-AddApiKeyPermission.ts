import { MigrationInterface, QueryRunner } from 'typeorm'
import { Role } from '../../../enterprise/database/entities/role.entity'
import { hasColumn } from '../../../utils/database.util'
import logger from '../../../utils/logger'

export class AddApiKeyPermission1765360298674 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const tableName = 'apikey'
        const columnName = 'permissions'

        const columnExists = await hasColumn(queryRunner, tableName, columnName)
        if (!columnExists) {
            await queryRunner.query(`ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" JSONB NOT NULL DEFAULT '[]'::jsonb;`)

            const permission =
                '["chatflows:view","chatflows:create","chatflows:update","chatflows:duplicate","chatflows:delete","chatflows:export","chatflows:import","chatflows:config","chatflows:domains","agentflows:view","agentflows:create","agentflows:update","agentflows:duplicate","agentflows:delete","agentflows:export","agentflows:import","agentflows:config","agentflows:domains","tools:view","tools:create","tools:update","tools:delete","tools:export","assistants:view","assistants:create","assistants:update","assistants:delete","credentials:view","credentials:create","credentials:update","credentials:delete","variables:view","variables:create","variables:update","variables:delete","apikeys:view","apikeys:create","apikeys:update","apikeys:delete","documentStores:view","documentStores:create","documentStores:update","documentStores:delete","documentStores:add-loader","documentStores:delete-loader","documentStores:preview-process","documentStores:upsert-config","executions:view","executions:delete","templates:marketplace","templates:custom","templates:custom-delete","templates:toolexport","templates:flowexport"]'

            await queryRunner.query(`UPDATE "${tableName}" SET "${columnName}" = '${permission}'::jsonb;`)
        }

        const sso = 'sso:manage'
        const apikey = 'apikeys:import'
        const itemsToRemove = [sso, apikey]
        const roles: Role[] = await queryRunner.query(
            `SELECT * FROM "role" WHERE "${columnName}" LIKE '%${sso}%' OR "${columnName}" LIKE '%${apikey}%';`
        )
        if (roles.length > 0) {
            for (const role of roles) {
                let permissions: string[] = []
                try {
                    permissions = JSON.parse(role.permissions)
                } catch (error) {
                    logger.error(`AddApiKeyPermission1765360298674 error parsing permissions for role ${role.id}:`, error)
                    continue
                }
                permissions = permissions.filter((permission: string) => !itemsToRemove.includes(permission))
                await queryRunner.query(`UPDATE "role" SET "${columnName}" = '${JSON.stringify(permissions)}' WHERE "id" = '${role.id}';`)
            }
        }
    }

    public async down(): Promise<void> {}
}
