import { MigrationInterface, QueryRunner } from "typeorm";

export class LoginActivity1756175430111 implements MigrationInterface {

    public async up(_queryRunner: QueryRunner): Promise<void> {
        // login_activity table is a base table, no migration needed
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "login_activity"`);
    }

}
