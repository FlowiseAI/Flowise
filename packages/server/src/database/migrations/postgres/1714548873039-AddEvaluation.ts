import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddEvaluation1714548873039 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS evaluation (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" varchar NOT NULL,
                "chatflowId" text NOT NULL,
                "chatflowName" text NOT NULL,
                "datasetId" varchar NOT NULL,
                "datasetName" varchar NOT NULL,
                "additionalConfig" text NULL,
                "evaluationType" varchar NOT NULL,
                "status" varchar NOT NULL,
                "average_metrics" text NULL,
                "runDate" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_98989043dd804f54-9830ab99f8" PRIMARY KEY (id)
            );`
        )
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS evaluation_run (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "evaluationId" varchar NOT NULL,
                "input" text NOT NULL,
                "expectedOutput" text NULL,
                "actualOutput" text NULL,
                "evaluators" text NULL,
                "llmEvaluators" text DEFAULT NULL,
                "metrics" text NULL,
                "runDate" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_98989927dd804f54-9840ab23f8" PRIMARY KEY (id)
            );`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE evaluation`)
        await queryRunner.query(`DROP TABLE evaluation_run`)
    }
}
