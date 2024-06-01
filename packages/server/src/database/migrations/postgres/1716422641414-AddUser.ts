import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUser1716422641414 implements MigrationInterface {
    name = 'AddUser1716422641414'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "auth0Id" character varying NOT NULL, "email" character varying NOT NULL, "name" character varying, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`
        )
        await queryRunner.query(`ALTER TABLE "chat_flow" ADD "userId" uuid`)
        await queryRunner.query(`ALTER TABLE "chat_message" ADD "userId" uuid`)
        await queryRunner.query(`ALTER TABLE "credential" ADD "userId" uuid`)
        await queryRunner.query(`ALTER TABLE "assistant" ADD "userId" uuid`)
        await queryRunner.query(`ALTER TABLE "chat_message_feedback" ADD "userId" uuid`)
        await queryRunner.query(`CREATE INDEX "IDX_eabfcfed8674ccc376ac2ed5e3" ON "chat_flow" ("userId") `)
        await queryRunner.query(`CREATE INDEX "IDX_a44ec486210e6f8b4591776d6f" ON "chat_message" ("userId") `)
        await queryRunner.query(`CREATE INDEX "IDX_51dc2344d47cea3102674c6496" ON "credential" ("userId") `)
        await queryRunner.query(`CREATE INDEX "IDX_b67bf802f4a770fe60f3185fe1" ON "assistant" ("userId") `)
        await queryRunner.query(`CREATE INDEX "IDX_b86c8a67f6262553911dc950f4" ON "chat_message_feedback" ("userId") `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "user"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_b86c8a67f6262553911dc950f4"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_b67bf802f4a770fe60f3185fe1"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_51dc2344d47cea3102674c6496"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_a44ec486210e6f8b4591776d6f"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_eabfcfed8674ccc376ac2ed5e3"`)
        await queryRunner.query(`ALTER TABLE "chat_message_feedback" DROP COLUMN "userId"`)
        await queryRunner.query(`ALTER TABLE "assistant" DROP COLUMN "userId"`)
        await queryRunner.query(`ALTER TABLE "credential" DROP COLUMN "userId"`)
        await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "userId"`)
        await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "userId"`)
    }
}
