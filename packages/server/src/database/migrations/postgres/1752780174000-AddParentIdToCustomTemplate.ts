import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddParentIdToCustomTemplate1752780174000 implements MigrationInterface {
    name = 'AddParentIdToCustomTemplate1752780174000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "custom_template" ADD "parentId" uuid`)
        await queryRunner.query(`CREATE INDEX "IDX_custom_template_parentId" ON "custom_template" ("parentId")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_custom_template_parentId"`)
        await queryRunner.query(`ALTER TABLE "custom_template" DROP COLUMN "parentId"`)
    }
}
