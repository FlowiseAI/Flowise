import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddWorkspaceIdToCustomTemplate1726655750383 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "custom_template" ADD COLUMN "workspaceId" TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "custom_template" DROP COLUMN "workspaceId";`)
    }
}
