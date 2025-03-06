import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddTypeToAssistant1733011290987 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const columnExists = await queryRunner.hasColumn('assistant', 'type')
        if (!columnExists) {
            await queryRunner.query(`ALTER TABLE "assistant" ADD COLUMN "type" TEXT;`)
            await queryRunner.query(`UPDATE "assistant" SET "type" = 'OPENAI';`)
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "assistant" DROP COLUMN "type";`)
    }
}
