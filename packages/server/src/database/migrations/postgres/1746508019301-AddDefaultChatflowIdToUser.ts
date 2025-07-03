import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddDefaultChatflowIdToUser1746508019301 implements MigrationInterface {
    name = 'AddDefaultChatflowIdToUser1746508019301'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "defaultChatflowId" character varying DEFAULT NULL`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "defaultChatflowId"`)
    }
}
