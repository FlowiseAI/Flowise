import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddWorkspaceShared1726654922034 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "workspace_shared" (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "workspaceId" varchar NOT NULL,
                "sharedItemId" varchar NOT NULL,
                "itemType" varchar NOT NULL,
                "createdDate" timestamp NOT NULL DEFAULT now(),
                "updatedDate" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_90016043dd804f55-9830ab97f8" PRIMARY KEY (id)
            );`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE workspace_shared`)
    }
}
