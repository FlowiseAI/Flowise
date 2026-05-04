import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSkill1777986000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS \`skill\` (
                \`id\` varchar(36) NOT NULL,
                \`workspaceId\` text NOT NULL,
                \`name\` varchar(255) NOT NULL,
                \`description\` text,
                \`iconSrc\` varchar(255),
                \`color\` varchar(16),
                \`fileTree\` longtext NOT NULL,
                \`contentDigest\` varchar(64) NOT NULL,
                \`publishedBundleId\` varchar(64),
                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                INDEX \`IDX_skill_workspaceId\` (\`workspaceId\`(255))
            ) ENGINE=InnoDB;`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS \`skill\``)
    }
}
