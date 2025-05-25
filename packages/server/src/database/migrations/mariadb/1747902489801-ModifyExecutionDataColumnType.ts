import { MigrationInterface, QueryRunner } from 'typeorm'

export class ModifyExecutionDataColumnType1747902489801 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`ALTER TABLE \`execution\` MODIFY COLUMN \`executionData\` LONGTEXT NOT NULL;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`ALTER TABLE \`execution\` MODIFY COLUMN \`executionData\` TEXT NOT NULL;`)
    }
}
