import { MigrationInterface, QueryRunner } from 'typeorm'

const PERM = 'externalOAuth:manage'

function parsePerms(raw: unknown): string[] | null {
    if (raw == null) return null
    if (Array.isArray(raw)) return raw as string[]
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw) as string[]
        } catch {
            return null
        }
    }
    return null
}

export class GrantExternalOAuthManage1768100001000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const roleTable = await queryRunner.getTable('role')
        if (roleTable) {
            const roles = (await queryRunner.query(
                `SELECT id, permissions, name FROM \`role\` WHERE LOWER(name) IN ('owner', 'personal workspace')`
            )) as Array<{ id: string; permissions: unknown }>
            for (const role of roles) {
                const permissions = parsePerms(role.permissions)
                if (!permissions || permissions.includes(PERM)) continue
                permissions.push(PERM)
                await queryRunner.query(`UPDATE \`role\` SET \`permissions\` = ? WHERE \`id\` = ?`, [JSON.stringify(permissions), role.id])
            }
        }

        const keys = (await queryRunner.query(`SELECT id, permissions FROM \`apikey\``)) as Array<{ id: string; permissions: unknown }>
        for (const key of keys) {
            const permissions = parsePerms(key.permissions)
            if (!permissions || permissions.includes(PERM) || !permissions.includes('apikeys:create')) continue
            permissions.push(PERM)
            await queryRunner.query(`UPDATE \`apikey\` SET \`permissions\` = ? WHERE \`id\` = ?`, [JSON.stringify(permissions), key.id])
        }
    }

    public async down(): Promise<void> {}
}
