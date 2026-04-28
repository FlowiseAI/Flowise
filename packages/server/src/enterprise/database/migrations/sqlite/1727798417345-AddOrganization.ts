import { MigrationInterface, QueryRunner } from 'typeorm'
import { ensureColumnExists } from './sqlliteCustomFunctions'

export class AddOrganization1727798417345 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "organization" ("id" varchar PRIMARY KEY NOT NULL, 
"name" text NOT NULL, 
"adminUserId" text, 
"defaultWsId" text, 
"organization_type" text, 
"createdDate" datetime NOT NULL DEFAULT (datetime('now')), 
"updatedDate" datetime NOT NULL DEFAULT (datetime('now')));`
        )

        await ensureColumnExists(queryRunner, 'workspace', 'organizationId', 'varchar')
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE organization`)

        await queryRunner.query(`ALTER TABLE "workspace" DROP COLUMN "organizationId";`)
    }
}
