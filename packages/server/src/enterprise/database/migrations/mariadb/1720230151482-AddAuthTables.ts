import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAuthTables1720230151482 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS \`user\` (
                \`id\` varchar(36) NOT NULL,
                \`name\` varchar(255),
                \`role\` varchar(20) NOT NULL,
                \`email\` varchar(100) NOT NULL,
                \`status\` varchar(20) NOT NULL,
                \`credential\` text,
                \`tempToken\` text,
                \`tokenExpiry\` datetime(6),
                \`activeWorkspaceId\` varchar(100),
                \`lastLogin\` datetime(6),
                PRIMARY KEY (\`id\`)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;`
        )
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS \`roles\` (
                \`id\` varchar(36) NOT NULL,
                \`name\` varchar(255),
                \`description\` text,
                \`permissions\` text,
                PRIMARY KEY (\`id\`)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;`
        )
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS \`login_activity\` (
                 \`id\` varchar(36) NOT NULL,
                \`username\` varchar(255),
                \`message\` varchar(255) NOT NULL,
                \`activity_code\` INT NOT NULL,
                \`attemptedDateTime\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE user`)
        await queryRunner.query(`DROP TABLE roles`)
        await queryRunner.query(`DROP TABLE login_activity`)
    }
}
