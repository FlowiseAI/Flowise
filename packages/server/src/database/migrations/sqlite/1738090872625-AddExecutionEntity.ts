import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddExecutionEntity1738090872625 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "execution" ("id" varchar PRIMARY KEY NOT NULL, "executionData" text NOT NULL, "action" text, "state" varchar NOT NULL, "agentflowId" varchar NOT NULL, "sessionId" varchar NOT NULL, "isPublic" boolean, "createdDate" datetime NOT NULL DEFAULT (datetime('now')), "updatedDate" datetime NOT NULL DEFAULT (datetime('now')), "stoppedDate" datetime);`
        )
        await queryRunner.query(`ALTER TABLE "chat_message" ADD COLUMN "executionId" varchar;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE execution`)
        await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "executionId";`)
    }
}
