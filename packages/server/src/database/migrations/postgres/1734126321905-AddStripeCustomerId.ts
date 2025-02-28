import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddStripeCustomerId1734126321905 implements MigrationInterface {
    name = 'AddStripeCustomerId1734126321905'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "stripeCustomerId" character varying DEFAULT NULL`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "stripeCustomerId"`)
    }
}
