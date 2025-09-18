import { MigrationInterface, QueryRunner } from 'typeorm'

export class ModifyTool1693997339912 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tool" ALTER COLUMN "schema" TYPE TEXT, ALTER COLUMN "func" TYPE TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tool" ALTER COLUMN "schema" TYPE VARCHAR, ALTER COLUMN "func" TYPE VARCHAR;`)
    }
}
