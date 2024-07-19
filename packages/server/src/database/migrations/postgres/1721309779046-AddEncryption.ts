import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddEncryption1721308320215 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "encryption" ("id" UUID PRIMARY KEY NOT NULL, "name" VARCHAR NOT NULL, "encryptionKey" VARCHAR NOT NULL, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now());`
        )
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "encryption_idx" ON"encryption"("id");`)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "credential_idx" ON"credential"("id");`)
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "encryption_credential" ("id" VARCHAR PRIMARY KEY NOT NULL, "encryptionId" UUID NOT NULL, "credentialId" UUID NOT NULL, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "fk_encryption" FOREIGN KEY ("encryptionId") REFERENCES "encryption"("id"), CONSTRAINT "fk_credential" FOREIGN KEY ("credentialId") REFERENCES "credential"("id"));`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS encryption_credential;`)
        await queryRunner.query(`DROP TABLE IF EXISTS encryption;`)
    }
}
