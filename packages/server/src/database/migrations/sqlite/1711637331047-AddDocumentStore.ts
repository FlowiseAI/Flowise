import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddDocumentStore1711637331047 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "document_store" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "name" varchar NOT NULL, 
                "description" varchar, 
                "status" varchar NOT NULL, 
                "loaders" text, 
                "whereUsed" text, 
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')),
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')));`
        )
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "document_store_file_chunk" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "docId" varchar NOT NULL, 
                "storeId" varchar NOT NULL, 
                "chunkNo" INTEGER NOT NULL, 
                "pageContent" text, 
                "metadata" text 
            );`
        )
        await queryRunner.query(`CREATE INDEX "IDX_e76bae1780b77e56aab1h2asd4" ON "document_store_file_chunk" ("docId") ;`)
        await queryRunner.query(`CREATE INDEX "IDX_e213b811b01405a42309a6a410" ON "document_store_file_chunk" ("storeId") ;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "document_store";`)
        await queryRunner.query(`DROP TABLE IF EXISTS "document_store_file_chunk";`)
    }
}
