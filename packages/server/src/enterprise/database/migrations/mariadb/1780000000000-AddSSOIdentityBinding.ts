import { MigrationInterface, QueryRunner } from 'typeorm'
import { ensureColumnExists } from './mariaDbCustomFunctions'

export class AddSSOIdentityBinding1780000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await ensureColumnExists(queryRunner, 'user', 'ssoProvider', 'varchar(100)')
        await ensureColumnExists(queryRunner, 'user', 'ssoSubjectId', 'varchar(255)')
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`ssoProvider\`;`)
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`ssoSubjectId\`;`)
    }
}
