import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddChat1732145631409 implements MigrationInterface {
    name = 'AddChat1732145631409'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "chat" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying, "chatflowChatId" character varying, "ownerId" uuid, "organizationId" uuid, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "deletedDate" TIMESTAMP, "chatflowId" uuid, CONSTRAINT "PK_9d0b2ba74336710fd31154738a5" PRIMARY KEY ("id"))`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "chat"`)
    }
}
