import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddVectorStoreConfigToDocStore1715861032479 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const columnExists = await queryRunner.hasColumn('document_store', 'vectorStoreConfig')
        if (!columnExists) {
            await queryRunner.query(`ALTER TABLE \`document_store\` ADD COLUMN \`vectorStoreConfig\` TEXT;`)
            await queryRunner.query(`ALTER TABLE \`document_store\` ADD COLUMN \`embeddingConfig\` TEXT;`)
            await queryRunner.query(`ALTER TABLE \`document_store\` ADD COLUMN \`recordManagerConfig\` TEXT;`)
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`document_store\` DROP COLUMN \`vectorStoreConfig\`;`)
        await queryRunner.query(`ALTER TABLE \`document_store\` DROP COLUMN \`embeddingConfig\`;`)
        await queryRunner.query(`ALTER TABLE \`document_store\` DROP COLUMN \`recordManagerConfig\`;`)
    }
}
