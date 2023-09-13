import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddChainLog1694609605433 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "chain_log" (
                "id" varchar PRIMARY KEY NOT NULL,
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')),
                "question" TEXT NOT NULL,
                "text" TEXT NOT NULL,
                "chatId" TEXT NOT NULL,
                "isInternal" BOOLEAN NOT NULL,
                "chatflowId" TEXT NOT NULL,
                "chatflowName" TEXT NOT NULL,
                "result" JSON NOT NULL
            );
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE chain_log`)
    }
}
