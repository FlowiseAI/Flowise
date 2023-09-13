import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddChainLog1694609605433 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE chain_log (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                created_date TIMESTAMP NOT NULL DEFAULT now(),
                question TEXT NOT NULL,
                text TEXT NOT NULL,
                chat_id TEXT NOT NULL,
                is_internal BOOLEAN NOT NULL,
                chatflow_id TEXT NOT NULL,
                chatflow_name TEXT NOT NULL,
                result JSON NOT NULL
            );
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE chain_log`)
    }
}
