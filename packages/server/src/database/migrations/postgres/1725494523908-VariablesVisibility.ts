import { MigrationInterface, QueryRunner } from "typeorm";

export class VariablesVisibility1725494523908 implements MigrationInterface {
    name = 'VariablesVisibility1725494523908'

    public async up(queryRunner: QueryRunner): Promise<void> {
     
        await queryRunner.query(`ALTER TABLE "variable" ADD "userId" uuid`);
        await queryRunner.query(`ALTER TABLE "variable" ADD "organizationId" uuid`);
        await queryRunner.query(`ALTER TABLE "variable" ADD "visibility" text NOT NULL DEFAULT 'Private'`);
        await queryRunner.query(`ALTER TABLE "variable" ALTER COLUMN "value" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "variable" ALTER COLUMN "type" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "variable" ALTER COLUMN "type" SET DEFAULT 'string'`);
    
        await queryRunner.query(`CREATE INDEX "IDX_b1d1cfdcf7ea567c336a953e2b" ON "variable" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_cb8b5ee5a4506ad331209882ef" ON "variable" ("organizationId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_cb8b5ee5a4506ad331209882ef"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b1d1cfdcf7ea567c336a953e2b"`);
        await queryRunner.query(`ALTER TABLE "variable" ALTER COLUMN "type" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "variable" ALTER COLUMN "type" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "variable" ALTER COLUMN "value" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "variable" DROP COLUMN "visibility"`);
        await queryRunner.query(`ALTER TABLE "variable" DROP COLUMN "organizationId"`);
        await queryRunner.query(`ALTER TABLE "variable" DROP COLUMN "userId"`);
  
    }

}
