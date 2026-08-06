import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSSOIdentityBinding1780000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "ssoProvider" varchar;`)
        await queryRunner.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "ssoSubjectId" varchar;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "ssoProvider";`)
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "ssoSubjectId";`)
    }
}
