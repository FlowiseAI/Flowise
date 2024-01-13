import { MigrationInterface, QueryRunner } from "typeorm";

export class ChatflowsAddPublic1705144141972 implements MigrationInterface {
    name = 'ChatflowsAddPublic1705144141972'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" ADD "public" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "public"`);
    }

}
