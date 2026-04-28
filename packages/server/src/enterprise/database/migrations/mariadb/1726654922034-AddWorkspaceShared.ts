import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddWorkspaceShared1726654922034 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS \`workspace_shared\` (
                \`id\` varchar(36) NOT NULL,
                \`workspaceId\` varchar(50) NOT NULL,
                \`sharedItemId\` varchar(50) NOT NULL,
                \`itemType\` varchar(50) NOT NULL,
                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE workspace_shared`)
    }
}
