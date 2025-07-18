import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddTemplateIdToChatFlow1752780175000 implements MigrationInterface {
    name = 'AddTemplateIdToChatFlow1752780175000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" ADD "templateId" uuid`)
        await queryRunner.query(`CREATE INDEX "IDX_chat_flow_templateId" ON "chat_flow" ("templateId")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_chat_flow_templateId"`)
        await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "templateId"`)
    }
}
