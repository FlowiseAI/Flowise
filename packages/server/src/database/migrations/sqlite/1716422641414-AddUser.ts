import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUser1716422641414 implements MigrationInterface {
    name = 'AddUser1716422641414'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "user" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "auth0Id" varchar NOT NULL, 
                "email" TEXT NOT NULL, 
                "name" TEXT, 
                "createdDate" DATETIME NOT NULL DEFAULT (datetime('now')), 
                "updatedDate" DATETIME NOT NULL DEFAULT (datetime('now'))
            )`
        )
        await queryRunner.query(`ALTER TABLE "chat_flow" ADD "userId" varchar`)
        await queryRunner.query(`ALTER TABLE "chat_message" ADD "userId" varchar`)
        await queryRunner.query(`ALTER TABLE "credential" ADD "userId" varchar`)
        await queryRunner.query(`ALTER TABLE "assistant" ADD "userId" varchar`)
        await queryRunner.query(`ALTER TABLE "chat_message_feedback" ADD "userId" varchar`)
        await queryRunner.query(`CREATE INDEX "IDX_eabfcfed8674ccc376ac2ed5e3" ON "chat_flow" ("userId") `)
        await queryRunner.query(`CREATE INDEX "IDX_a44ec486210e6f8b4591776d6f" ON "chat_message" ("userId") `)
        await queryRunner.query(`CREATE INDEX "IDX_51dc2344d47cea3102674c6496" ON "credential" ("userId") `)
        await queryRunner.query(`CREATE INDEX "IDX_b67bf802f4a770fe60f3185fe1" ON "assistant" ("userId") `)
        await queryRunner.query(`CREATE INDEX "IDX_b86c8a67f6262553911dc950f4" ON "chat_message_feedback" ("userId") `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "user"`)
        await queryRunner.query(`DROP INDEX "IDX_b86c8a67f6262553911dc950f4"`)
        await queryRunner.query(`DROP INDEX "IDX_b67bf802f4a770fe60f3185fe1"`)
        await queryRunner.query(`DROP INDEX "IDX_51dc2344d47cea3102674c6496"`)
        await queryRunner.query(`DROP INDEX "IDX_a44ec486210e6f8b4591776d6f"`)
        await queryRunner.query(`DROP INDEX "IDX_eabfcfed8674ccc376ac2ed5e3"`)
        await queryRunner.query(`ALTER TABLE "chat_message_feedback" DROP COLUMN "userId"`)
        await queryRunner.query(`ALTER TABLE "assistant" DROP COLUMN "userId"`)
        await queryRunner.query(`ALTER TABLE "credential" DROP COLUMN "userId"`)
        await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "userId"`)
        await queryRunner.query(`ALTER TABLE "chat_flow" DROP COLUMN "userId"`)
    }
}
