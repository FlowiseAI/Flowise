import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddWorkspaceShared1726654922034 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "workspace_shared" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "workspaceId" varchar NOT NULL, 
                "sharedItemId" varchar NOT NULL, 
                "itemType" varchar NOT NULL, 
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')), 
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')));`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE workspace_shared`)
    }
}
