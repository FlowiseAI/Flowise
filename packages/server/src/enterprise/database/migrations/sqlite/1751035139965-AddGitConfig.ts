import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddGitConfig1751035139965 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "git_config" (
                "id" varchar(36) PRIMARY KEY,
                "organizationId" varchar(36),
                "provider" varchar(32) NOT NULL DEFAULT 'github',
                "repository" text NOT NULL,
                "authMode" varchar(16) NOT NULL DEFAULT 'token',
                "username" varchar(100) NOT NULL,
                "secret" text NOT NULL,
                "branchName" varchar(100) DEFAULT 'main',
                "isActive" boolean DEFAULT false,
                "createdDate" datetime DEFAULT (datetime('now')),
                "updatedDate" datetime DEFAULT (datetime('now')),
                "createdBy" varchar(36) NOT NULL,
                "updatedBy" varchar(36) NOT NULL,
                FOREIGN KEY ("organizationId") REFERENCES "organization"("id"),
                FOREIGN KEY ("createdBy") REFERENCES "user"("id"),
                FOREIGN KEY ("updatedBy") REFERENCES "user"("id")
            );
        `)

        // Add columns to chat_flow table
        await queryRunner.query(`
            ALTER TABLE "chat_flow" 
            ADD COLUMN "lastPublishedAt" datetime;
        `)
        await queryRunner.query(`
            ALTER TABLE "chat_flow" 
            ADD COLUMN "lastPublishedCommit" varchar;
        `)
        await queryRunner.query(`
            ALTER TABLE "chat_flow" 
            ADD COLUMN "isDirty" boolean DEFAULT 1;
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Note: SQLite doesn't support DROP COLUMN in older versions
        // This would require recreating the table, but for simplicity we'll leave it as is
        // In a real scenario, you might want to create a new migration to handle this
        
        await queryRunner.query('DROP TABLE IF EXISTS "git_config";')
    }
} 