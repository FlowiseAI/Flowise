import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddExternalOAuthIntegration1768100000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "external_oauth_integration" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" varchar(255) NOT NULL,
                "enabled" boolean NOT NULL DEFAULT true,
                "issuerUrl" text NOT NULL,
                "audiences" text NOT NULL,
                "allowedClientIds" text,
                "permissionScopeMap" text NOT NULL,
                "customPermissionsClaimName" varchar(128),
                "organizationId" varchar(36) NOT NULL,
                "workspaceId" varchar(36) NOT NULL,
                "createdDate" timestamp NOT NULL DEFAULT now(),
                "updatedDate" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_external_oauth_integration" PRIMARY KEY ("id")
            );
        `)
        await queryRunner.query(`CREATE INDEX "IDX_ext_oauth_issuer" ON "external_oauth_integration" ("issuerUrl");`)

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "federated_account" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "issuerUrl" text NOT NULL,
                "subject" varchar(512) NOT NULL,
                "organizationId" varchar(36) NOT NULL,
                "workspaceId" varchar(36) NOT NULL,
                "userId" varchar(36),
                "email" varchar(512),
                "createdDate" timestamp NOT NULL DEFAULT now(),
                "updatedDate" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_federated_account" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_federated_issuer_sub" UNIQUE ("issuerUrl", "subject")
            );
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "federated_account";`)
        await queryRunner.query(`DROP TABLE IF EXISTS "external_oauth_integration";`)
    }
}
