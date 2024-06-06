import { MigrationInterface, QueryRunner } from 'typeorm'

export class UpdateChatflowToHaveParentId1717796909629 implements MigrationInterface {
    name = 'UpdateChatflowToHaveParentId1717796909629'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" ADD "parentChatflowId" uuid`)
        await queryRunner.query(`CREATE INDEX "IDX_442b9a2cff872736117c8742b1" ON "chat_flow" ("parentChatflowId") `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_442b9a2cff872736117c8742b1"`)
        await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "parentChatflowId"`)
    }
}
