import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddApiKey1720230151480 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS \`apikey\` (
                \`id\` varchar(36) NOT NULL,
                \`apiKey\` varchar(255) NOT NULL,
                \`apiSecret\` varchar(255) NOT NULL,
                \`keyName\` varchar(255) NOT NULL,
                \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE apikey`)
    }
}
