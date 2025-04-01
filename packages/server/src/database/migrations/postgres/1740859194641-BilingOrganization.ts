import { MigrationInterface, QueryRunner } from 'typeorm'

export class BilingOrganization1740859194641 implements MigrationInterface {
    name = 'BilingOrganization1740859194641'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organization" ADD "billingPoolEnabled" boolean NOT NULL DEFAULT false`)
        await queryRunner.query(`ALTER TABLE "organization" ADD "stripeCustomerId" character varying DEFAULT NULL`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "organizationId" DROP NOT NULL`)
        await queryRunner.query(`ALTER TABLE "organization" DROP COLUMN "stripeCustomerId"`)
        await queryRunner.query(`ALTER TABLE "organization" DROP COLUMN "billingPoolEnabled"`)
    }
}
