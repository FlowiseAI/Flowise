import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSeqNoToDatasetRow1733752119696 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const columnExists = await queryRunner.hasColumn('dataset_row', 'sequence_no')
        if (!columnExists) queryRunner.query(`ALTER TABLE \`dataset_row\` ADD COLUMN \`sequence_no\` INT DEFAULT -1;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`dataset_row\` DROP COLUMN \`sequence_no\``)
    }
}
