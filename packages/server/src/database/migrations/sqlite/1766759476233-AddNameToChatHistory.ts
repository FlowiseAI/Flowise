import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddNameToChatHistory1766759476233 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_message" ADD COLUMN "name" VARCHAR;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "name";`)
    }
}
