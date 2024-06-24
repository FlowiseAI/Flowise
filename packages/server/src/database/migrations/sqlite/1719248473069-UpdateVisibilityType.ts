import { MigrationInterface, QueryRunner } from 'typeorm'

export class UpdateVisibilityType1719248473069 implements MigrationInterface {
    name = 'UpdateVisibilityType1719248473069'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" RENAME COLUMN "visibility" TO "visibility_old"`)
        await queryRunner.query(`ALTER TABLE "chat_flow" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'Private'`)
        await queryRunner.query(`UPDATE "chat_flow" SET "visibility" = "visibility_old"`)
        await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "visibility_old"`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" RENAME COLUMN "visibility" TO "visibility_old"`)
        await queryRunner.query(`ALTER TABLE "chat_flow" ADD COLUMN "visibility" TEXT`)
        await queryRunner.query(`UPDATE "chat_flow" SET "visibility" = "visibility_old"`)
        await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "visibility_old"`)
    }
}
