import { MigrationInterface, QueryRunner } from 'typeorm'

export class UpdateDefaultVisibility1717684633931 implements MigrationInterface {
    name = 'UpdateDefaultVisibility1717684633931'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" ADD COLUMN "visibility" TEXT DEFAULT 'Private'`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "visibility"`)
    }
}
