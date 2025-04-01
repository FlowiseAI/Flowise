import { MigrationInterface, QueryRunner } from 'typeorm'

export class UpdateUserUniqueAuth0Id1741898609435 implements MigrationInterface {
    name = 'UpdateUserUniqueAuth0Id1741898609435'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "UQ_49c08de80c2fd2f6a7ba5ce97c4" UNIQUE ("auth0Id")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "UQ_49c08de80c2fd2f6a7ba5ce97c4"`)
    }
}
