import { MigrationInterface, QueryRunner } from 'typeorm'
import { ensureColumnExists } from './mariaDbCustomFunctions'

export class ExecutionLinkWorkspaceId1746862866554 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // step 1 - add workspaceId column
        await ensureColumnExists(queryRunner, 'execution', 'workspaceId', 'varchar(36)')

        // step 2 - add index and foreign key for workspaceId
        await queryRunner.query(`
            ALTER TABLE \`execution\`
            ADD INDEX \`idx_execution_workspaceId\` (\`workspaceId\`),
            ADD CONSTRAINT \`fk_execution_workspaceId\`
            FOREIGN KEY (\`workspaceId\`)
            REFERENCES \`workspace\`(\`id\`);
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // step 1 - drop index and foreign key for workspaceId
        await queryRunner.query(`
            ALTER TABLE \`execution\`
            DROP INDEX \`idx_execution_workspaceId\`,
            DROP FOREIGN KEY \`fk_execution_workspaceId\`;
        `)

        // step 2 - drop workspaceId column
        await queryRunner.query(`ALTER TABLE \`execution\` DROP COLUMN \`workspaceId\`;`)
    }
}
