import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAnswersConfig1714692854264 implements MigrationInterface {
    name = 'AddAnswersConfig1714692854264'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" ADD COLUMN IF NOT EXISTS "answersConfig" TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "answersConfig";`)
    }
}
