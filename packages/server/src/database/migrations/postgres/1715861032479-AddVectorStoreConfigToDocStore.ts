import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddVectorStoreConfigToDocStore1715861032479 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "document_store" ADD COLUMN IF NOT EXISTS "vectorStoreConfig" TEXT;`)
        await queryRunner.query(`ALTER TABLE "document_store" ADD COLUMN IF NOT EXISTS "embeddingConfig" TEXT;`)
        await queryRunner.query(`ALTER TABLE "document_store" ADD COLUMN IF NOT EXISTS "recordManagerConfig" TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "document_store" DROP COLUMN "vectorStoreConfig";`)
        await queryRunner.query(`ALTER TABLE "document_store" DROP COLUMN "embeddingConfig";`)
        await queryRunner.query(`ALTER TABLE "document_store" DROP COLUMN "recordManagerConfig";`)
    }
}
