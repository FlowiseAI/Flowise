import { MigrationInterface, QueryRunner } from 'typeorm'

export class UpdateUserIDDocumentStore1735609968505 implements MigrationInterface {
  name = 'UpdateUserIDDocumentStore1735609968505'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "document_store" ADD "userId" uuid`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "document_store" DROP COLUMN "userId"`)
  }
}
