import { MigrationInterface, QueryRunner } from 'typeorm'

export class UpdateVisibilityType1718820404840 implements MigrationInterface {
    name = 'UpdateVisibilityType1718820404840'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_f56c36fe42894d57e5c664d229"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_e76bae1780b77e56aab1h2asd4"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_e213b811b01405a42309a6a410"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_f56c36fe42894d57e5c664d230"`)
        await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "visibility"`)
        await queryRunner.query(
            `CREATE TYPE "public"."chat_flow_visibility_enum" AS ENUM('Private', 'Public', 'Organization', 'AnswerAI', 'Marketplace')`
        )
        await queryRunner.query(
            `ALTER TABLE "chat_flow" ADD "visibility" "public"."chat_flow_visibility_enum" array NOT NULL DEFAULT '{Private}'`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "visibility"`)
        await queryRunner.query(`DROP TYPE "public"."chat_flow_visibility_enum"`)
        await queryRunner.query(`ALTER TABLE "chat_flow" ADD "visibility" text array DEFAULT '{Private}'`)
    }
}
