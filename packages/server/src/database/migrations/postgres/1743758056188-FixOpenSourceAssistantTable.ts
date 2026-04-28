import { MigrationInterface, QueryRunner } from 'typeorm'
import { Assistant } from '../../entities/Assistant'

export class FixOpenSourceAssistantTable1743758056188 implements MigrationInterface {
    name = 'FixOpenSourceAssistantTable1743758056188'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const columnExists = await queryRunner.hasColumn('assistant', 'type')
        if (!columnExists) {
            await queryRunner.query(`ALTER TABLE "assistant" ADD COLUMN "type" TEXT;`)
            await queryRunner.query(`UPDATE "assistant" SET "type" = 'OPENAI';`)

            const assistants: Assistant[] = await queryRunner.query(`SELECT * FROM "assistant";`)
            for (let assistant of assistants) {
                const details = JSON.parse(assistant.details)
                if (!details?.id) await queryRunner.query(`UPDATE "assistant" SET "type" = 'CUSTOM' WHERE id = '${assistant.id}';`)
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "assistant" DROP COLUMN "type";`)
    }
}
