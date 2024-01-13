import { MigrationInterface, QueryRunner } from 'typeorm'

export class ModifyCredential1693923551694 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "temp_credential" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "credentialName" varchar NOT NULL, "encryptedData" text NOT NULL, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "updatedDate" datetime NOT NULL DEFAULT (datetime('now')));`
        )
        await queryRunner.query(
            `INSERT INTO "temp_credential" ("id", "name", "credentialName", "encryptedData", "createdDate", "updatedDate") SELECT "id", "name", "credentialName", "encryptedData", "createdDate", "updatedDate" FROM "credential";`
        )
        await queryRunner.query(`DROP TABLE credential;`)
        await queryRunner.query(`ALTER TABLE temp_credential RENAME TO credential;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE temp_credential`)
    }
}
