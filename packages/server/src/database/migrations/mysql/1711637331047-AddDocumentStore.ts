import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddDocumentStore1711637331047 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS \`document_store\` (
                \`id\` varchar(36) NOT NULL,
                \`name\` varchar(255) NOT NULL,
                \`description\` varchar(255),
                \`subFolder\` varchar(255) NOT NULL,
                \`files\` text,
                \`metrics\` text,
                \`whereUsed\` text,
                \`status\` varchar(20) NOT NULL,
                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`
        )
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS \`document_store_file_chunk\` (
                \`id\` varchar(36) NOT NULL,
                \`docId\` varchar(36) NOT NULL,
                \`storeId\` varchar(36) NOT NULL,
                \`pageContent\` text,
                \`metadata\` text,
                PRIMARY KEY (\`id\`)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE document_store`)
        await queryRunner.query(`DROP TABLE document_store_file_chunk`)
    }
}
