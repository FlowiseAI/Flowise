import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDomainToChatFlow1739529313173 implements MigrationInterface {
    name = 'AddDomainToChatFlow1739529313173'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" ADD COLUMN IF NOT EXISTS "domain" TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "domain";`)
    }

}
