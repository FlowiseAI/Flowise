import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSSOColumns1730519457880 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "sso_config" text;`)
        await queryRunner.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "user_type" varchar;`)
        await queryRunner.query(`ALTER TABLE "login_activity" ADD COLUMN IF NOT EXISTS "login_mode" varchar;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organization" DROP COLUMN "sso_config";`)
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "user_type";`)
        await queryRunner.query(`ALTER TABLE "login_activity" DROP COLUMN "login_mode";`)
    }
}
