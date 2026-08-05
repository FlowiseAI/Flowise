import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddConversationSummaryBufferState1783987200000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE conversation_summary_buffer_state (
                "stateKey" varchar(64) NOT NULL,
                "chatflowid" uuid NOT NULL,
                "sessionId" varchar NOT NULL,
                "nodeId" varchar NOT NULL,
                "summary" text NOT NULL,
                "cursorCreatedDate" timestamp,
                "cursorMessageId" uuid,
                "version" integer NOT NULL DEFAULT 1,
                "createdDate" timestamp NOT NULL DEFAULT now(),
                "updatedDate" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_conversation_summary_buffer_state" PRIMARY KEY ("stateKey")
            );
        `)
        await queryRunner.query(
            `CREATE INDEX "IDX_conversation_summary_buffer_state_session" ON conversation_summary_buffer_state ("chatflowid", "sessionId");`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_conversation_summary_buffer_state_session"`)
        await queryRunner.query(`DROP TABLE conversation_summary_buffer_state`)
    }
}
