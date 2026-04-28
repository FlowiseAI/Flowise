import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddWorkspace1720230151484 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS workspace (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" varchar NOT NULL,
                "description" varchar NULL,
                "createdDate" timestamp NOT NULL DEFAULT now(),
                "updatedDate" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_98719043dd804f55-9830ab99f8" PRIMARY KEY (id)
            );`
        )
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS workspace_users (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "workspaceId" varchar NOT NULL,
                "userId" varchar NOT NULL,
                "role" varchar NULL,
                CONSTRAINT "PK_98718943dd804f55-9830ab99f8" PRIMARY KEY (id)
            );`
        )

        await queryRunner.query(`ALTER TABLE "chat_flow" ADD COLUMN IF NOT EXISTS "workspaceId" varchar;`)
        await queryRunner.query(`ALTER TABLE "tool" ADD COLUMN IF NOT EXISTS "workspaceId" varchar;`)
        await queryRunner.query(`ALTER TABLE "assistant" ADD COLUMN IF NOT EXISTS "workspaceId" varchar;`)
        await queryRunner.query(`ALTER TABLE "credential" ADD COLUMN IF NOT EXISTS "workspaceId" varchar;`)
        await queryRunner.query(`ALTER TABLE "document_store" ADD COLUMN IF NOT EXISTS "workspaceId" varchar;`)
        await queryRunner.query(`ALTER TABLE "evaluation" ADD COLUMN IF NOT EXISTS "workspaceId" varchar;`)
        await queryRunner.query(`ALTER TABLE "evaluator" ADD COLUMN IF NOT EXISTS "workspaceId" varchar;`)
        await queryRunner.query(`ALTER TABLE "dataset" ADD COLUMN IF NOT EXISTS "workspaceId" varchar;`)
        await queryRunner.query(`ALTER TABLE "apikey" ADD COLUMN IF NOT EXISTS "workspaceId" varchar;`)
        await queryRunner.query(`ALTER TABLE "variable" ADD COLUMN IF NOT EXISTS "workspaceId" varchar;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE workspace`)
        await queryRunner.query(`DROP TABLE workspace_users`)

        await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "workspaceId";`)
        await queryRunner.query(`ALTER TABLE "tool" DROP COLUMN "workspaceId";`)
        await queryRunner.query(`ALTER TABLE "assistant" DROP COLUMN "workspaceId";`)
        await queryRunner.query(`ALTER TABLE "credential" DROP COLUMN "workspaceId";`)
        await queryRunner.query(`ALTER TABLE "document_store" DROP COLUMN "workspaceId";`)
        await queryRunner.query(`ALTER TABLE "evaluation" DROP COLUMN "workspaceId";`)
        await queryRunner.query(`ALTER TABLE "evaluator" DROP COLUMN "workspaceId";`)
        await queryRunner.query(`ALTER TABLE "dataset" DROP COLUMN "workspaceId";`)
        await queryRunner.query(`ALTER TABLE "apikey" DROP COLUMN "workspaceId";`)
        await queryRunner.query(`ALTER TABLE "variable" DROP COLUMN "workspaceId";`)
    }
}
