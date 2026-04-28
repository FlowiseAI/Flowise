import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddOrganization1727798417345 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS \`organization\` (
                \`id\` varchar(36) NOT NULL,
                \`name\` varchar(255) NOT NULL,
                \`adminUserId\` varchar(255) NULL,
                \`defaultWsId\` varchar(255) NULL,
                \`organization_type\` varchar(255) NULL,
                \`createdDate\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedDate\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
				PRIMARY KEY (\`id\`),
                KEY \`idx_organization_id\` (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`
        )
        await queryRunner.query(`ALTER TABLE \`workspace\` ADD COLUMN \`organizationId\` varchar(36);`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS \`organization\`;`)

        await queryRunner.query(`ALTER TABLE \`workspace\` DROP COLUMN \`organizationId\`;`)
    }
}
