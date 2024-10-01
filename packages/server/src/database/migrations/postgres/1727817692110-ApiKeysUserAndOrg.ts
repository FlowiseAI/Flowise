import { MigrationInterface, QueryRunner } from 'typeorm'

export class ApiKeysUserAndOrg1727817692110 implements MigrationInterface {
    name = 'ApiKeysUserAndOrg1727817692110'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "apikey" ADD "organizationId" uuid NOT NULL`)
        await queryRunner.query(`ALTER TABLE "apikey" ADD "userId" uuid NOT NULL`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "apikey" DROP COLUMN "userId"`)
        await queryRunner.query(`ALTER TABLE "apikey" DROP COLUMN "organizationId"`)
    }
}
