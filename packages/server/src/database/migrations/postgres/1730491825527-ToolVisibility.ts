import { MigrationInterface, QueryRunner } from 'typeorm'

export class ToolVisibility1730491825527 implements MigrationInterface {
    name = 'ToolVisibility1730491825527'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tool" ADD "visibility" text NOT NULL DEFAULT 'Private'`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tool" DROP COLUMN "visibility"`)
    }
}
