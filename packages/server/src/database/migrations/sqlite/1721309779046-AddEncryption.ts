import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddEncryption1721308320215 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "encryption" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "encryptionKey" varchar NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "updatedDate" datetime NOT NULL DEFAULT (datetime('now')));`
        )
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "encryption_idx" ON
"encryption"("id");`
        )
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "credential_idx" ON
        "credential"("id");`
        )
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "encryption_credential" ("id" varchar PRIMARY KEY NOT NULL, "encryptionId" varchar NOT NULL, "credentialId" varchar NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "updatedDate" datetime NOT NULL DEFAULT (datetime('now')), FOREIGN KEY ("encryptionId") REFERENCES "encryption"("id"), FOREIGN KEY ("credentialId") REFERENCES "credential"("id"));`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS encryption_credential;`)
        await queryRunner.query(`DROP TABLE IF EXISTS encryption;`)
    }
}
