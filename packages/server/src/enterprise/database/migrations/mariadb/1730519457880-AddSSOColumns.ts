import { MigrationInterface, QueryRunner } from 'typeorm'
import { ensureColumnExists } from './mariaDbCustomFunctions'

export class AddSSOColumns1730519457880 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await ensureColumnExists(queryRunner, 'organization', 'sso_config', 'text')
        await ensureColumnExists(queryRunner, 'user', 'user_type', 'varchar(10)')
        await ensureColumnExists(queryRunner, 'login_activity', 'login_mode', 'varchar(25)')
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`organization\` DROP COLUMN \`sso_config\`;`)
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`user_type\`;`)
        await queryRunner.query(`ALTER TABLE \`login_activity\` DROP COLUMN \`login_mode\`;`)
    }
}
