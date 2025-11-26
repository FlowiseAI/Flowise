import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddEvaluation1714548873039 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS \`evaluation\` (
                \`id\` varchar(36) NOT NULL,
                \`chatflowId\` LONGTEXT NOT NULL,
                \`datasetId\` LONGTEXT NOT NULL,
                \`name\` varchar(255) NOT NULL,
                \`chatflowName\` varchar(255) NOT NULL,
                \`datasetName\` varchar(255) NOT NULL,
                \`additionalConfig\` LONGTEXT,
                \`average_metrics\` LONGTEXT NOT NULL,
                \`status\` varchar(10) NOT NULL,
                \`evaluationType\` varchar(20) NOT NULL,
                \`runDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`
        )
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS \`evaluation_run\` (
                \`id\` varchar(36) NOT NULL,
                \`evaluationId\` varchar(36) NOT NULL,
                \`expectedOutput\` LONGTEXT NOT NULL,
                \`actualOutput\` LONGTEXT NOT NULL,
                \`evaluators\` LONGTEXT,
                \`input\` LONGTEXT DEFAULT NULL,
                \`metrics\` TEXT DEFAULT NULL,
                \`llmEvaluators\` TEXT DEFAULT NULL,
                \`runDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE evaluation`)
        await queryRunner.query(`DROP TABLE evaluation_run`)
    }
}
