import { MigrationInterface, QueryRunner } from 'typeorm'

export class ModifyExecutionSessionIdFieldType1748450230238 implements MigrationInterface {
    name = 'ModifyExecutionSessionIdFieldType1748450230238'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "execution" ALTER COLUMN "sessionId" type varchar USING "sessionId"::varchar`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "execution" ALTER COLUMN "sessionId" type uuid USING "sessionId"::uuid`)
    }
}
