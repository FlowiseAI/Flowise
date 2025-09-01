import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddFlowHistoryEntity1750000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS \`flow_history\` (
                \`id\` varchar(36) NOT NULL,
                \`entityType\` varchar(20) NOT NULL,
                \`entityId\` varchar(36) NOT NULL,
                \`snapshotData\` longtext NOT NULL,
                \`changeDescription\` text DEFAULT NULL,
                \`version\` int NOT NULL,
                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`workspaceId\` text DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                INDEX \`IDX_flow_history_entity_version\` (\`entityType\`, \`entityId\`, \`version\`),
                INDEX \`IDX_flow_history_entity_date\` (\`entityType\`, \`entityId\`, \`createdDate\`)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE flow_history`)
    }
}
