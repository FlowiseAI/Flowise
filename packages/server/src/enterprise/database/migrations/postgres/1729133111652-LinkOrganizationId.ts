import { MigrationInterface, QueryRunner } from 'typeorm'

export class LinkOrganizationId1729133111652 implements MigrationInterface {
    name = 'LinkOrganizationId1729133111652'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // step 1 - convert from varchar to UUID type
        await queryRunner.query(`
            ALTER TABLE "workspace" ALTER COLUMN "organizationId" SET DATA TYPE UUID USING "organizationId"::UUID;
        `)

        // step 2 - add foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "workspace" ADD CONSTRAINT "fk_workspace_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organization"("id");
        `)

        // step 3 - create index for organizationId
        await queryRunner.query(`
            CREATE INDEX "idx_workspace_organizationId" ON "workspace"("organizationId");
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // step 1 - drop index
        await queryRunner.query(`
            DROP INDEX "idx_workspace_organizationId";
        `)

        // step 2 - drop foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "workspace" DROP CONSTRAINT "fk_workspace_organizationId";
        `)

        // Step 3 - convert from UUID to varchar type
        await queryRunner.query(`
            ALTER TABLE "workspace" ALTER COLUMN "organizationId" SET DATA TYPE varchar USING "organizationId"::varchar;
        `)
    }
}
