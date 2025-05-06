import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddBrowserExtConfig1746508019300 implements MigrationInterface {
    name = 'AddBrowserExtConfig1746508019300'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" ADD COLUMN "browserExtConfig" JSONB`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "browserExtConfig"`)
    }
}
