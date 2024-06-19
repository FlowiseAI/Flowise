import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddOrganizationId1717629010538 implements MigrationInterface {
    name = 'AddOrganizationId1717629010538'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" ADD "organizationId" TEXT`)
        await queryRunner.query(`ALTER TABLE "chat_message" ADD "organizationId" TEXT`)
        await queryRunner.query(`ALTER TABLE "credential" ADD "organizationId" TEXT`)
        await queryRunner.query(`ALTER TABLE "tool" ADD "organizationId" TEXT`)
        await queryRunner.query(`ALTER TABLE "assistant" ADD "organizationId" TEXT`)
        await queryRunner.query(`ALTER TABLE "document_store" ADD "userId" TEXT`)
        await queryRunner.query(`ALTER TABLE "document_store" ADD "organizationId" TEXT`)
        await queryRunner.query(`ALTER TABLE "document_store_file_chunk" ADD "userId" TEXT`)
        await queryRunner.query(`ALTER TABLE "document_store_file_chunk" ADD "organizationId" TEXT`)
        await queryRunner.query(`ALTER TABLE "chat_message_feedback" ADD "organizationId" TEXT`)
        await queryRunner.query(`ALTER TABLE "user" ADD "organizationId" TEXT`)
        await queryRunner.query(`CREATE INDEX "IDX_896d7288df42b25577ad3a3c23" ON "chat_flow" ("organizationId")`)
        await queryRunner.query(`CREATE INDEX "IDX_ca2cfde93a1bf4d8b6d034aac6" ON "chat_message" ("organizationId")`)
        await queryRunner.query(`CREATE INDEX "IDX_9a71758809deb02ca226e6b2c6" ON "credential" ("organizationId")`)
        await queryRunner.query(`CREATE INDEX "IDX_b84b21f9ba69f589cd5da36afa" ON "tool" ("organizationId")`)
        await queryRunner.query(`CREATE INDEX "IDX_886f335c73254c53d9528f818b" ON "assistant" ("organizationId")`)
        await queryRunner.query(`CREATE INDEX "IDX_98e40056815e127ee41dbb96ab" ON "document_store" ("userId")`)
        await queryRunner.query(`CREATE INDEX "IDX_b08a45f51b71bca5acc9d270c4" ON "document_store" ("organizationId")`)
        await queryRunner.query(`CREATE INDEX "IDX_e28550b1dd9e091193fa3ed22a" ON "document_store_file_chunk" ("docId")`)
        await queryRunner.query(`CREATE INDEX "IDX_c791442eeab0fbf5219b6f78c0" ON "document_store_file_chunk" ("storeId")`)
        await queryRunner.query(`CREATE INDEX "IDX_cb9732346aef0c1fb65ca855e4" ON "document_store_file_chunk" ("userId")`)
        await queryRunner.query(`CREATE INDEX "IDX_e359f729ae249266a184ccd344" ON "document_store_file_chunk" ("organizationId")`)
        await queryRunner.query(`CREATE INDEX "IDX_668e0900a065910efc7dcbb4cd" ON "chat_message_feedback" ("organizationId")`)
        await queryRunner.query(`CREATE INDEX "IDX_dfda472c0af7812401e592b6a6" ON "user" ("organizationId")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_dfda472c0af7812401e592b6a6"`)
        await queryRunner.query(`DROP INDEX "IDX_668e0900a065910efc7dcbb4cd"`)
        await queryRunner.query(`DROP INDEX "IDX_e359f729ae249266a184ccd344"`)
        await queryRunner.query(`DROP INDEX "IDX_cb9732346aef0c1fb65ca855e4"`)
        await queryRunner.query(`DROP INDEX "IDX_c791442eeab0fbf5219b6f78c0"`)
        await queryRunner.query(`DROP INDEX "IDX_e28550b1dd9e091193fa3ed22a"`)
        await queryRunner.query(`DROP INDEX "IDX_b08a45f51b71bca5acc9d270c4"`)
        await queryRunner.query(`DROP INDEX "IDX_98e40056815e127ee41dbb96ab"`)
        await queryRunner.query(`DROP INDEX "IDX_886f335c73254c53d9528f818b"`)
        await queryRunner.query(`DROP INDEX "IDX_b84b21f9ba69f589cd5da36afa"`)
        await queryRunner.query(`DROP INDEX "IDX_9a71758809deb02ca226e6b2c6"`)
        await queryRunner.query(`DROP INDEX "IDX_ca2cfde93a1bf4d8b6d034aac6"`)
        await queryRunner.query(`DROP INDEX "IDX_896d7288df42b25577ad3a3c23"`)
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "organizationId"`)
        await queryRunner.query(`ALTER TABLE "chat_message_feedback" DROP COLUMN "organizationId"`)
        await queryRunner.query(`ALTER TABLE "document_store_file_chunk" DROP COLUMN "organizationId"`)
        await queryRunner.query(`ALTER TABLE "document_store_file_chunk" DROP COLUMN "userId"`)
        await queryRunner.query(`ALTER TABLE "document_store" DROP COLUMN "organizationId"`)
        await queryRunner.query(`ALTER TABLE "document_store" DROP COLUMN "userId"`)
        await queryRunner.query(`ALTER TABLE "assistant" DROP COLUMN "organizationId"`)
        await queryRunner.query(`ALTER TABLE "tool" DROP COLUMN "organizationId"`)
        await queryRunner.query(`ALTER TABLE "credential" DROP COLUMN "organizationId"`)
        await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "organizationId"`)
        await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "organizationId"`)
    }
}
