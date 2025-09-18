import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddFeedback1707213601923 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS chat_message_feedback (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "chatflowid" varchar NOT NULL,
                "content" text,
                "chatId" varchar NOT NULL,
                "messageId" varchar NOT NULL,
                "rating" varchar NOT NULL,
                "createdDate" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_98419043dd704f54-9830ab78f9" PRIMARY KEY (id)
            );`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE chat_message_feedback`)
    }
}
