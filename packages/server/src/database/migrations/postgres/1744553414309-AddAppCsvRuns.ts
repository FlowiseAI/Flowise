import { MigrationInterface, QueryRunner } from 'typeorm'

export class AppCsvRuns1744553414309 implements MigrationInterface {
    name = 'AppCsvRuns1744553414309'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "app_csv_parse_runs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "organizationId" uuid NOT NULL, "startedAt" TIMESTAMP NOT NULL, "completedAt" TIMESTAMP, "rowsRequested" integer NOT NULL, "rowsProcessed" integer, "name" text NOT NULL, "configuration" json NOT NULL, "originalCsvUrl" text NOT NULL, "processedCsvUrl" text, "chatflowChatId" text NOT NULL, "includeOriginalColumns" boolean NOT NULL DEFAULT false, "status" text NOT NULL, "errorMessages" json NOT NULL, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_21b59834715d12d9455b63a496d" PRIMARY KEY ("id"))`
        )
        await queryRunner.query(`CREATE INDEX "IDX_326a632876d0cff0b71d6a57f1" ON "app_csv_parse_runs" ("userId") `)
        await queryRunner.query(`CREATE INDEX "IDX_8e72c75e3e7b5cc751fa6429fb" ON "app_csv_parse_runs" ("organizationId") `)
        await queryRunner.query(
            `CREATE TABLE "app_csv_parse_rows" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "csvParseRunId" uuid NOT NULL, "rowNumber" integer NOT NULL, "rowData" json NOT NULL, "generatedData" json, "status" text NOT NULL, "errorMessage" text, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP NOT NULL, CONSTRAINT "PK_9d839afdaafe641a70bd747944d" PRIMARY KEY ("id"))`
        )
        await queryRunner.query(`CREATE INDEX "IDX_fd8dacb78914b50e53dba611ee" ON "app_csv_parse_rows" ("csvParseRunId") `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_fd8dacb78914b50e53dba611ee"`)
        await queryRunner.query(`DROP TABLE "app_csv_parse_rows"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_8e72c75e3e7b5cc751fa6429fb"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_326a632876d0cff0b71d6a57f1"`)
        await queryRunner.query(`DROP TABLE "app_csv_parse_runs"`)
    }
}
