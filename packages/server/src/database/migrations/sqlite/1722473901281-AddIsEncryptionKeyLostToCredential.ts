import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddIsEncryptionKeyLostToCredential1722473901281 implements MigrationInterface {
    name = 'AddIsEncryptionKeyLostToCredential1722473901281'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "credential" ADD COLUMN "isEncryptionKeyLost" BOOLEAN NOT NULL DEFAULT FALSE;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "credential" DROP COLUMN "isEncryptionKeyLost";`)
    }
}
