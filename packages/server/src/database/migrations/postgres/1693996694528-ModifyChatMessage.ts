import { MigrationInterface, QueryRunner } from 'typeorm'

export class ModifyChatMessage1693996694528 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_message" ALTER COLUMN "sourceDocuments" TYPE TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_message" ALTER COLUMN "sourceDocuments" TYPE VARCHAR;`)
    }
}
