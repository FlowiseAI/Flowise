import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUserScopingToExecution1738091000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "execution" ADD COLUMN "userId" uuid;`)
        await queryRunner.query(`ALTER TABLE "execution" ADD COLUMN "organizationId" uuid;`)
        await queryRunner.query(`CREATE INDEX "IDX_execution_userId" ON "execution" ("userId");`)
        await queryRunner.query(`CREATE INDEX "IDX_execution_organizationId" ON "execution" ("organizationId");`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_execution_userId";`)
        await queryRunner.query(`DROP INDEX "IDX_execution_organizationId";`)
        await queryRunner.query(`ALTER TABLE "execution" DROP COLUMN "userId";`)
        await queryRunner.query(`ALTER TABLE "execution" DROP COLUMN "organizationId";`)
    }
} 