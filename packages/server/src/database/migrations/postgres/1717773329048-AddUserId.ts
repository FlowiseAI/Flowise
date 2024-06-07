import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUserId1717773329048 implements MigrationInterface {
    name = 'AddUserId1717773329048'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tool" ADD "userId" uuid`)
        await queryRunner.query(`CREATE INDEX "IDX_68b86fcfc928d194f745a50939" ON "tool" ("userId") `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_68b86fcfc928d194f745a50939"`)
        await queryRunner.query(`ALTER TABLE "tool" DROP COLUMN "userId"`)
    }
}
