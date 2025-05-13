import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddExecutionEntity1738090872625 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS execution (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "executionData" text NOT NULL,
                "action" text,
                "state" varchar NOT NULL,
                "agentflowId" uuid NOT NULL,
                "sessionId" uuid NOT NULL,
                "isPublic" boolean,
                "createdDate" timestamp NOT NULL DEFAULT now(),
                "updatedDate" timestamp NOT NULL DEFAULT now(),
                "stoppedDate" timestamp,
                CONSTRAINT "PK_936a419c3b8044598d72d95da61" PRIMARY KEY (id)
            );`
        )

        const columnExists = await queryRunner.hasColumn('chat_message', 'executionId')
        if (!columnExists) {
            await queryRunner.query(`ALTER TABLE "chat_message" ADD COLUMN "executionId" uuid;`)
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE execution`)
        await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "executionId";`)
    }
}
