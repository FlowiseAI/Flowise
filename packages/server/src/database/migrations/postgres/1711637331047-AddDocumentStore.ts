import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddDocumentStore1711637331047 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS document_store (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" varchar NOT NULL,
                "description" varchar,
                "subFolder" varchar NOT NULL,
                "files" text,
                "whereUsed" text,
                "metrics" text,
                "status" varchar NOT NULL,
                "createdDate" timestamp NOT NULL DEFAULT now(),
                "updatedDate" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_98495043dd774f54-9830ab78f9" PRIMARY KEY (id)
            );`
        )
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS document_store_file_chunk (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "docId" uuid NOT NULL,
                "storeId" uuid NOT NULL,
                "pageContent" text,
                "metadata" text,
                CONSTRAINT "PK_90005043dd774f54-9830ab78f9" PRIMARY KEY (id)
            );`
        )
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_e574599922298fd938f4f0f3d3" ON document_store_file_chunk USING btree (docId);`
        )
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_e574599922298fd938f4f0f3d4" ON document_store_file_chunk USING btree (storeId);`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE document_store`)
        await queryRunner.query(`DROP TABLE document_store_file_chunk`)
    }
}
