import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddChainLog1694609598769 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE chain_log (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
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
