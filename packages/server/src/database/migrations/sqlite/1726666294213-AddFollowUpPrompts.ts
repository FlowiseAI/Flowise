import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddFollowUpPrompts1726666294213 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" ADD COLUMN "followUpPrompts" TEXT;`)
        await queryRunner.query(`ALTER TABLE "chat_message" ADD COLUMN "followUpPrompts" TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "followUpPrompts";`)
        await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "followUpPrompts";`)
    }
}
