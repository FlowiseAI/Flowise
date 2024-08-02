import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddIsEncryptionKeyLostToCredential1722473901281 implements MigrationInterface {
    name = 'AddIsEncryptionKeyLostToCredential1722473901281'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Credential" ADD COLUMN "isEncryptionKeyLost" BOOLEAN NOT NULL DEFAULT FALSE;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Credential" DROP COLUMN "isEncryptionKeyLost";`)
    }
}
