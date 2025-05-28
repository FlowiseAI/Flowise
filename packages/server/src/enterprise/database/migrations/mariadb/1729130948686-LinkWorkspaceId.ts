import { MigrationInterface, QueryRunner } from 'typeorm'

export class LinkWorkspaceId1729130948686 implements MigrationInterface {
    name = 'LinkWorkspaceId1729130948686'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // step 1 - add index and foreign key for workspaceId
        await queryRunner.query(`
            ALTER TABLE \`apikey\`
            ADD INDEX \`idx_apikey_workspaceId\` (\`workspaceId\`),
            ADD CONSTRAINT \`fk_apikey_workspaceId\`
            FOREIGN KEY (\`workspaceId\`)
            REFERENCES \`workspace\`(\`id\`);
        `)

        // step 1 - add index and foreign key for activeWorkspaceId
        await queryRunner.query(`
            ALTER TABLE \`user\`
            ADD INDEX \`idx_user_activeWorkspaceId\` (\`activeWorkspaceId\`),
            ADD CONSTRAINT \`fk_user_activeWorkspaceId\`
            FOREIGN KEY (\`activeWorkspaceId\`)
            REFERENCES \`workspace\`(\`id\`);
        `)

        // step 1 - add index and foreign key for workspaceId
        await queryRunner.query(`
            ALTER TABLE \`workspace_users\`
            ADD INDEX \`idx_workspace_users_workspaceId\` (\`workspaceId\`),
            ADD CONSTRAINT \`fk_workspace_users_workspaceId\`
            FOREIGN KEY (\`workspaceId\`)
            REFERENCES \`workspace\`(\`id\`);
        `)

        // step 1 - add index and foreign key for workspaceId
        await queryRunner.query(`
            ALTER TABLE \`chat_flow\`
            ADD INDEX \`idx_chat_flow_workspaceId\` (\`workspaceId\`),
            ADD CONSTRAINT \`fk_chat_flow_workspaceId\`
            FOREIGN KEY (\`workspaceId\`)
            REFERENCES \`workspace\`(\`id\`);
        `)

        // step 1 - add index and foreign key for workspaceId
        await queryRunner.query(`
            ALTER TABLE \`tool\`
            ADD INDEX \`idx_tool_workspaceId\` (\`workspaceId\`),
            ADD CONSTRAINT \`fk_tool_workspaceId\`
            FOREIGN KEY (\`workspaceId\`)
            REFERENCES \`workspace\`(\`id\`);
        `)

        // step 1 - add index and foreign key for workspaceId
        await queryRunner.query(`
            ALTER TABLE \`assistant\`
            ADD INDEX \`idx_assistant_workspaceId\` (\`workspaceId\`),
            ADD CONSTRAINT \`fk_assistant_workspaceId\`
            FOREIGN KEY (\`workspaceId\`)
            REFERENCES \`workspace\`(\`id\`);
        `)

        // step 1 - add index and foreign key for workspaceId
        await queryRunner.query(`
            ALTER TABLE \`credential\`
            ADD INDEX \`idx_credential_workspaceId\` (\`workspaceId\`),
            ADD CONSTRAINT \`fk_credential_workspaceId\`
            FOREIGN KEY (\`workspaceId\`)
            REFERENCES \`workspace\`(\`id\`);
        `)

        // step 1 - add index and foreign key for workspaceId
        await queryRunner.query(`
            ALTER TABLE \`document_store\`
            ADD INDEX \`idx_document_store_workspaceId\` (\`workspaceId\`),
            ADD CONSTRAINT \`fk_document_store_workspaceId\`
            FOREIGN KEY (\`workspaceId\`)
            REFERENCES \`workspace\`(\`id\`);
        `)

        // step 1 - add index and foreign key for workspaceId
        await queryRunner.query(`
            ALTER TABLE \`evaluation\`
            ADD INDEX \`idx_evaluation_workspaceId\` (\`workspaceId\`),
            ADD CONSTRAINT \`fk_evaluation_workspaceId\`
            FOREIGN KEY (\`workspaceId\`)
            REFERENCES \`workspace\`(\`id\`);
        `)

        // step 1 - add index and foreign key for workspaceId
        await queryRunner.query(`
            ALTER TABLE \`evaluator\`
            ADD INDEX \`idx_evaluator_workspaceId\` (\`workspaceId\`),
            ADD CONSTRAINT \`fk_evaluator_workspaceId\`
            FOREIGN KEY (\`workspaceId\`)
            REFERENCES \`workspace\`(\`id\`);
        `)

        // step 1 - add index and foreign key for workspaceId
        await queryRunner.query(`
            ALTER TABLE \`dataset\`
            ADD INDEX \`idx_dataset_workspaceId\` (\`workspaceId\`),
            ADD CONSTRAINT \`fk_dataset_workspaceId\`
            FOREIGN KEY (\`workspaceId\`)
            REFERENCES \`workspace\`(\`id\`);
        `)

        // step 1 - add index and foreign key for workspaceId
        await queryRunner.query(`
            ALTER TABLE \`variable\`
            ADD INDEX \`idx_variable_workspaceId\` (\`workspaceId\`),
            ADD CONSTRAINT \`fk_variable_workspaceId\`
            FOREIGN KEY (\`workspaceId\`)
            REFERENCES \`workspace\`(\`id\`);
        `)

        // step 1 - add index and foreign key for workspaceId
        await queryRunner.query(`
            ALTER TABLE \`workspace_shared\`
            ADD INDEX \`idx_workspace_shared_workspaceId\` (\`workspaceId\`),
            ADD CONSTRAINT \`fk_workspace_shared_workspaceId\`
            FOREIGN KEY (\`workspaceId\`)
            REFERENCES \`workspace\`(\`id\`);
        `)

        // step 1 - add index and foreign key for workspaceId
        await queryRunner.query(`
            ALTER TABLE \`custom_template\`
            ADD INDEX \`idx_custom_template_workspaceId\` (\`workspaceId\`),
            ADD CONSTRAINT \`fk_custom_template_workspaceId\`
            FOREIGN KEY (\`workspaceId\`)
            REFERENCES \`workspace\`(\`id\`);
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // step 1 - drop index and foreign key for workspaceId
        await queryRunner.query(`
            ALTER TABLE \`apikey\`
            DROP INDEX \`idx_apikey_workspaceId\`,
            DROP FOREIGN KEY \`fk_apikey_workspaceId\`;
        `)

        // step 1 - drop index and foreign key for activeWorkspaceId
        await queryRunner.query(`
            ALTER TABLE \`user\`
            DROP INDEX \`idx_user_activeWorkspaceId\`,
            DROP FOREIGN KEY \`fk_user_activeWorkspaceId\`;
        `)

        // step 1 - drop index and foreign key for workspaceId
        await queryRunner.query(`
            ALTER TABLE \`workspace_users\`
            DROP INDEX \`idx_workspace_users_workspaceId\`,
            DROP FOREIGN KEY \`fk_workspace_users_workspaceId\`;
        `)

        // step 1 - drop index and foreign key for workspaceId
        await queryRunner.query(`
            ALTER TABLE \`chat_flow\`
            DROP INDEX \`idx_chat_flow_workspaceId\`,
            DROP FOREIGN KEY \`fk_chat_flow_workspaceId\`;
        `)

        // step 1 - drop index and foreign key for workspaceId
        await queryRunner.query(`
            ALTER TABLE \`tool\`
            DROP INDEX \`idx_tool_workspaceId\`,
            DROP FOREIGN KEY \`fk_tool_workspaceId\`;
        `)

        // step 1 - drop index and foreign key for workspaceId
        await queryRunner.query(`
            ALTER TABLE \`assistant\`
            DROP INDEX \`idx_assistant_workspaceId\`,
            DROP FOREIGN KEY \`fk_assistant_workspaceId\`;
        `)

        // step 1 - drop index and foreign key for workspaceId
        await queryRunner.query(`
            ALTER TABLE \`credential\`
            DROP INDEX \`idx_credential_workspaceId\`,
            DROP FOREIGN KEY \`fk_credential_workspaceId\`;
        `)

        // step 1 - drop index and foreign key for workspaceId
        await queryRunner.query(`
            ALTER TABLE \`document_store\`
            DROP INDEX \`idx_document_store_workspaceId\`,
            DROP FOREIGN KEY \`fk_document_store_workspaceId\`;
        `)

        // step 1 - drop index and foreign key for workspaceId
        await queryRunner.query(`
            ALTER TABLE \`evaluation\`
            DROP INDEX \`idx_evaluation_workspaceId\`,
            DROP FOREIGN KEY \`fk_evaluation_workspaceId\`;
        `)

        // step 1 - drop index and foreign key for workspaceId
        await queryRunner.query(`
            ALTER TABLE \`evaluator\`
            DROP INDEX \`idx_evaluator_workspaceId\`,
            DROP FOREIGN KEY \`fk_evaluator_workspaceId\`;
        `)

        // step 1 - drop index and foreign key for workspaceId
        await queryRunner.query(`
            ALTER TABLE \`dataset\`
            DROP INDEX \`idx_dataset_workspaceId\`,
            DROP FOREIGN KEY \`fk_dataset_workspaceId\`;
        `)

        // step 1 - drop index and foreign key for workspaceId
        await queryRunner.query(`
            ALTER TABLE \`variable\`
            DROP INDEX \`idx_variable_workspaceId\`,
            DROP FOREIGN KEY \`fk_variable_workspaceId\`;
        `)

        // step 1 - drop index and foreign key for workspaceId
        await queryRunner.query(`
            ALTER TABLE \`workspace_shared\`
            DROP INDEX \`idx_workspace_shared_workspaceId\`,
            DROP FOREIGN KEY \`fk_workspace_shared_workspaceId\`;
        `)

        // step 1 - drop index and foreign key for workspaceId
        await queryRunner.query(`
            ALTER TABLE \`custom_template\`
            DROP INDEX \`idx_custom_template_workspaceId\`,
            DROP FOREIGN KEY \`fk_custom_template_workspaceId\`;
        `)
    }
}
