import { MigrationInterface, QueryRunner } from 'typeorm'

export class ModifyTool1694001465232 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tool\` MODIFY \`schema\` TEXT, MODIFY \`func\` TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tool\` MODIFY \`schema\` VARCHAR, MODIFY \`func\` VARCHAR;`)
    }
}
