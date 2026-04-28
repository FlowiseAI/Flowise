import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAgentsPermission1775497538678 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add agents:* permissions to roles that have corresponding assistants:* permissions
        // Uses SQL replace() for O(1) bulk operations — safe for millions of rows

        await queryRunner.query(
            `UPDATE "role" SET "permissions" = REPLACE("permissions", '"assistants:view"', '"assistants:view","agents:view"') WHERE "permissions" LIKE '%assistants:view%' AND "permissions" NOT LIKE '%agents:view%';`
        )
        await queryRunner.query(
            `UPDATE "role" SET "permissions" = REPLACE("permissions", '"assistants:create"', '"assistants:create","agents:create","agents:duplicate","agents:export","agents:import"') WHERE "permissions" LIKE '%assistants:create%' AND "permissions" NOT LIKE '%agents:create%';`
        )
        await queryRunner.query(
            `UPDATE "role" SET "permissions" = REPLACE("permissions", '"assistants:update"', '"assistants:update","agents:update","agents:config","agents:domains"') WHERE "permissions" LIKE '%assistants:update%' AND "permissions" NOT LIKE '%agents:update%';`
        )
        await queryRunner.query(
            `UPDATE "role" SET "permissions" = REPLACE("permissions", '"assistants:delete"', '"assistants:delete","agents:delete"') WHERE "permissions" LIKE '%assistants:delete%' AND "permissions" NOT LIKE '%agents:delete%';`
        )

        await queryRunner.query(
            `UPDATE "apikey" SET "permissions" = REPLACE("permissions", '"assistants:view"', '"assistants:view","agents:view"') WHERE "permissions" LIKE '%assistants:view%' AND "permissions" NOT LIKE '%agents:view%';`
        )
        await queryRunner.query(
            `UPDATE "apikey" SET "permissions" = REPLACE("permissions", '"assistants:create"', '"assistants:create","agents:create","agents:duplicate","agents:export","agents:import"') WHERE "permissions" LIKE '%assistants:create%' AND "permissions" NOT LIKE '%agents:create%';`
        )
        await queryRunner.query(
            `UPDATE "apikey" SET "permissions" = REPLACE("permissions", '"assistants:update"', '"assistants:update","agents:update","agents:config","agents:domains"') WHERE "permissions" LIKE '%assistants:update%' AND "permissions" NOT LIKE '%agents:update%';`
        )
        await queryRunner.query(
            `UPDATE "apikey" SET "permissions" = REPLACE("permissions", '"assistants:delete"', '"assistants:delete","agents:delete"') WHERE "permissions" LIKE '%assistants:delete%' AND "permissions" NOT LIKE '%agents:delete%';`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const tables = ['"role"', '"apikey"']
        for (const table of tables) {
            await queryRunner.query(
                `UPDATE ${table} SET "permissions" = REPLACE("permissions", '"assistants:delete","agents:delete"', '"assistants:delete"') WHERE "permissions" LIKE '%agents:delete%';`
            )
            await queryRunner.query(
                `UPDATE ${table} SET "permissions" = REPLACE("permissions", '"assistants:update","agents:update","agents:config","agents:domains"', '"assistants:update"') WHERE "permissions" LIKE '%agents:update%';`
            )
            await queryRunner.query(
                `UPDATE ${table} SET "permissions" = REPLACE("permissions", '"assistants:create","agents:create","agents:duplicate","agents:export","agents:import"', '"assistants:create"') WHERE "permissions" LIKE '%agents:create%';`
            )
            await queryRunner.query(
                `UPDATE ${table} SET "permissions" = REPLACE("permissions", '"assistants:view","agents:view"', '"assistants:view"') WHERE "permissions" LIKE '%agents:view%';`
            )
        }
    }
}
