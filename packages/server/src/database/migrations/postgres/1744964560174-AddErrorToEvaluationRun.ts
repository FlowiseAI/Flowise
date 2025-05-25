import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddErrorToEvaluationRun1744964560174 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "evaluation_run" ADD COLUMN IF NOT EXISTS "errors" TEXT NULL DEFAULT '[]';`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "evaluation_run" DROP COLUMN "errors";`)
    }
}
