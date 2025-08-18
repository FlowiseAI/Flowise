import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddEnabledIntegrationsToOrganization1752614576000 implements MigrationInterface {
    name = 'AddEnabledIntegrationsToOrganization1752614576000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organization" ADD "enabledIntegrations" jsonb`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organization" DROP COLUMN "enabledIntegrations"`)
    }
}
