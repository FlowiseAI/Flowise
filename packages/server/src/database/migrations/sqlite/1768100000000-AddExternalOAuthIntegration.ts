import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddExternalOAuthIntegration1768100000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "external_oauth_integration" (
                "id" varchar(36) NOT NULL PRIMARY KEY,
                "name" varchar(255) NOT NULL,
                "enabled" boolean NOT NULL DEFAULT 1,
                "issuerUrl" text NOT NULL,
                "audiences" text NOT NULL,
                "allowedClientIds" text,
                "permissionScopeMap" text NOT NULL,
                "customPermissionsClaimName" varchar(128),
                "organizationId" varchar(36) NOT NULL,
                "workspaceId" varchar(36) NOT NULL,
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now'))
            );
        `)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ext_oauth_issuer" ON "external_oauth_integration" ("issuerUrl");`)
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "federated_account" (
                "id" varchar(36) NOT NULL PRIMARY KEY,
                "issuerUrl" text NOT NULL,
                "subject" varchar(512) NOT NULL,
                "organizationId" varchar(36) NOT NULL,
                "workspaceId" varchar(36) NOT NULL,
                "userId" varchar(36),
                "email" varchar(512),
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now'))
            );
        `)
        await queryRunner.query(
            `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_federated_issuer_sub" ON "federated_account" ("issuerUrl", "subject");`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "federated_account";`)
        await queryRunner.query(`DROP TABLE IF EXISTS "external_oauth_integration";`)
    }
}
