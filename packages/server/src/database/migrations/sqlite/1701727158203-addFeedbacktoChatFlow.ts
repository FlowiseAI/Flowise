import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFeedbacktoChatFlow1701727158203 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        ALTER TABLE chat_message
        ADD COLUMN feedback TEXT;
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        ALTER TABLE chat_message
        DROP COLUMN feedback;
    `);
    }
}
