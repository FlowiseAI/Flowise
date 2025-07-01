import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddGitConfig1751035139965 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "git_config" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "organizationId" uuid,
                "provider" varchar(32) NOT NULL DEFAULT 'github',
                "repository" text NOT NULL,
                "authMode" varchar(16) NOT NULL DEFAULT 'token',
                "username" varchar(100) NOT NULL,
                "secret" text NOT NULL,
                "branchName" varchar(100) DEFAULT 'main',
                "isActive" boolean DEFAULT false,
                "createdDate" timestamp DEFAULT now(),
                "updatedDate" timestamp DEFAULT now(),
                "createdBy" uuid NOT NULL,
                "updatedBy" uuid NOT NULL,
                CONSTRAINT "fk_gitconfig_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organization"("id"),
                CONSTRAINT "fk_gitconfig_createdBy" FOREIGN KEY ("createdBy") REFERENCES "user"("id"),
                CONSTRAINT "fk_gitconfig_updatedBy" FOREIGN KEY ("updatedBy") REFERENCES "user"("id")
            );
        `)

        // Add columns to chat_flow table
        await queryRunner.query(`
            ALTER TABLE "chat_flow" 
            ADD COLUMN "lastPublishedAt" timestamp,
            ADD COLUMN "lastPublishedCommit" varchar,
            ADD COLUMN "isDirty" boolean DEFAULT true;
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove columns from chat_flow table
        await queryRunner.query(`
            ALTER TABLE "chat_flow" 
            DROP COLUMN IF EXISTS "lastPublishedAt",
            DROP COLUMN IF EXISTS "lastPublishedCommit",
            DROP COLUMN IF EXISTS "isDirty";
        `)
        
        await queryRunner.query('DROP TABLE IF EXISTS "git_config";')
    }
} 