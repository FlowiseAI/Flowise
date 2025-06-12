import { MigrationInterface, QueryRunner } from 'typeorm'
import { OrganizationStatus } from '../../entities/organization.entity'

export class AddStatusInOrganization1749714174104 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`alter table "organization" add column "status" varchar(20) default '${OrganizationStatus.ACTIVE}' not null;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`alter table "organization" drop column "status";`)
    }
}
