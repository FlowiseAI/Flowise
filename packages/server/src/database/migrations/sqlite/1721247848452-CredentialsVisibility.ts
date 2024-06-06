import { MigrationInterface, QueryRunner } from 'typeorm'

export class CredentialsVisibility1721247848452 implements MigrationInterface {
    name = 'CredentialsVisibility1721247848452'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "credential" ADD "visibility" text NOT NULL DEFAULT 'Private'`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "credential" DROP COLUMN "visibility"`)
    }
}
