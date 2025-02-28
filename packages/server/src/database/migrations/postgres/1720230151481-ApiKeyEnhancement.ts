import { MigrationInterface, QueryRunner } from 'typeorm'

export class ApiKeyEnhancement1720230151481 implements MigrationInterface {
    name = 'ApiKeyEnhancement1720230151481'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add new columns
        await queryRunner.query(`ALTER TABLE "apikey" ADD COLUMN IF NOT EXISTS "lastUsedAt" TIMESTAMP`)
        await queryRunner.query(`ALTER TABLE "apikey" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true`)
        await queryRunner.query(`ALTER TABLE "apikey" ADD COLUMN IF NOT EXISTS "metadata" JSONB`)

        // Set default values for existing records
        await queryRunner.query(`UPDATE "apikey" SET "lastUsedAt" = NOW(), "metadata" = '{}' WHERE "lastUsedAt" IS NULL`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove columns in reverse order
        await queryRunner.query(`ALTER TABLE "apikey" DROP COLUMN IF EXISTS "metadata"`)
        await queryRunner.query(`ALTER TABLE "apikey" DROP COLUMN IF EXISTS "isActive"`)
        await queryRunner.query(`ALTER TABLE "apikey" DROP COLUMN IF EXISTS "lastUsedAt"`)
    }
}
