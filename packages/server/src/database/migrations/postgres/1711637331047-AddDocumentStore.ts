import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddDocumentStore1711637331047 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS document_store (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" varchar NOT NULL,
                "description" varchar NOT NULL,
                "subFolder" varchar NOT NULL,
                "files" text,
                "config" text,
                "metrics" text,
                "type" varchar NOT NULL,
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
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE document_store`)
        await queryRunner.query(`DROP TABLE document_store_file_chunk`)
    }
}
