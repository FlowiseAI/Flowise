import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddConversationSummaryBufferState1783987200000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "conversation_summary_buffer_state" (
                "stateKey" varchar(64) PRIMARY KEY NOT NULL,
                "chatflowid" varchar NOT NULL,
                "sessionId" varchar NOT NULL,
                "nodeId" varchar NOT NULL,
                "summary" text NOT NULL,
                "cursorCreatedDate" datetime,
                "cursorMessageId" varchar,
                "version" integer NOT NULL DEFAULT 1,
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now'))
            );
        `)
        await queryRunner.query(
            `CREATE INDEX "IDX_conversation_summary_buffer_state_session" ON "conversation_summary_buffer_state" ("chatflowid", "sessionId");`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_conversation_summary_buffer_state_session"`)
        await queryRunner.query(`DROP TABLE "conversation_summary_buffer_state"`)
    }
}
