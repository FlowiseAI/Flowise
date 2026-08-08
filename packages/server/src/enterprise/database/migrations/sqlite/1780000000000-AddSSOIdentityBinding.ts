import { MigrationInterface, QueryRunner } from 'typeorm'
import { ensureColumnExists } from './sqlliteCustomFunctions'

export class AddSSOIdentityBinding1780000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await ensureColumnExists(queryRunner, 'user', 'ssoProvider', 'varchar')
        await ensureColumnExists(queryRunner, 'user', 'ssoSubjectId', 'varchar')
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "ssoProvider";`)
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "ssoSubjectId";`)
    }
}
