import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddEncryption1721308320215 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "encryption" (
            "id" UUID PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(), 
            "name" VARCHAR NOT NULL, 
            "encryptionKey" VARCHAR NOT NULL, 
            "createdDate" TIMESTAMP NOT NULL DEFAULT now(), 
            "updatedDate" TIMESTAMP NOT NULL DEFAULT now()
            );`
        )
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "encryption_credential" (
            "id" UUID PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(), 
            "encryptionId" UUID NOT NULL, 
            "credentialId" UUID NOT NULL, 
            "createdDate" TIMESTAMP NOT NULL DEFAULT now(), 
            "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), 
            CONSTRAINT "fk_encryption" FOREIGN KEY ("encryptionId") REFERENCES "encryption"("id"), 
            CONSTRAINT "fk_credential" FOREIGN KEY ("credentialId") REFERENCES "credential"("id"));`
        )
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_encryptionId" ON"encryption_credential"("encryptionId");`)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_credentialId" ON"encryption_credential"("credentialId");`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS encryption_credential;`)
        await queryRunner.query(`DROP TABLE IF EXISTS encryption;`)
    }
}
