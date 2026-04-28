import { MigrationInterface, QueryRunner } from 'typeorm'

export class FixDocumentStoreFileChunkLongText1765000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`document_store_file_chunk\` MODIFY \`pageContent\` LONGTEXT NOT NULL;`)
        await queryRunner.query(`ALTER TABLE \`document_store_file_chunk\` MODIFY \`metadata\` LONGTEXT NULL;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // WARNING: Reverting to TEXT may cause data loss if content exceeds the 64KB limit.
        await queryRunner.query(`ALTER TABLE \`document_store_file_chunk\` MODIFY \`pageContent\` TEXT NOT NULL;`)
        await queryRunner.query(`ALTER TABLE \`document_store_file_chunk\` MODIFY \`metadata\` TEXT NULL;`)
    }
}
