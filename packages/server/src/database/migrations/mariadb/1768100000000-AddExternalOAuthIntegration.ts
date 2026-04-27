import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddExternalOAuthIntegration1768100000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`external_oauth_integration\` (
                \`id\` varchar(36) NOT NULL PRIMARY KEY,
                \`name\` varchar(255) NOT NULL,
                \`enabled\` tinyint(1) NOT NULL DEFAULT 1,
                \`issuerUrl\` text NOT NULL,
                \`audiences\` text NOT NULL,
                \`allowedClientIds\` text,
                \`permissionScopeMap\` text NOT NULL,
                \`customPermissionsClaimName\` varchar(128),
                \`organizationId\` varchar(36) NOT NULL,
                \`workspaceId\` varchar(36) NOT NULL,
                \`createdDate\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedDate\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
        `)
        await queryRunner.query(`CREATE INDEX \`IDX_ext_oauth_issuer\` ON \`external_oauth_integration\` (\`issuerUrl\`(768));`)

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`federated_account\` (
                \`id\` varchar(36) NOT NULL PRIMARY KEY,
                \`issuerUrl\` text NOT NULL,
                \`subject\` varchar(512) NOT NULL,
                \`organizationId\` varchar(36) NOT NULL,
                \`workspaceId\` varchar(36) NOT NULL,
                \`userId\` varchar(36) NULL,
                \`email\` varchar(512) NULL,
                \`createdDate\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedDate\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE KEY \`UQ_federated_issuer_sub\` (\`issuerUrl\`(255), \`subject\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS \`federated_account\`;`)
        await queryRunner.query(`DROP TABLE IF EXISTS \`external_oauth_integration\`;`)
    }
}
