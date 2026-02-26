import { MigrationInterface, QueryRunner } from 'typeorm'

export class MigrateChatFlowToVersioning1770000000001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Migrate existing chat_flow records to chat_flow_master
        await queryRunner.query(
            `INSERT INTO \`chat_flow_master\` (\`id\`, \`name\`, \`type\`, \`workspaceId\`, \`category\`, \`isPublic\`, \`createdDate\`, \`updatedDate\`)
            SELECT
                \`id\`,
                \`name\`,
                COALESCE(\`type\`, 'CHATFLOW'),
                \`workspaceId\`,
                \`category\`,
                \`isPublic\`,
                \`createdDate\`,
                \`updatedDate\`
            FROM \`chat_flow\`
            ON DUPLICATE KEY UPDATE \`id\` = \`id\`;`
        )

        // Create version 1 for each flow in chat_flow_version
        await queryRunner.query(
            `INSERT INTO \`chat_flow_version\` (
                \`id\`,
                \`masterId\`,
                \`version\`,
                \`isActive\`,
                \`flowData\`,
                \`apikeyid\`,
                \`chatbotConfig\`,
                \`apiConfig\`,
                \`analytic\`,
                \`speechToText\`,
                \`textToSpeech\`,
                \`followUpPrompts\`,
                \`changeDescription\`,
                \`sourceVersion\`,
                \`createdBy\`,
                \`createdDate\`,
                \`updatedDate\`
            )
            SELECT
                UUID(),
                \`id\`,
                1,
                1,
                \`flowData\`,
                \`apikeyid\`,
                \`chatbotConfig\`,
                \`apiConfig\`,
                \`analytic\`,
                \`speechToText\`,
                \`textToSpeech\`,
                \`followUpPrompts\`,
                'Migrated from legacy chat_flow',
                NULL,
                NULL,
                \`createdDate\`,
                \`updatedDate\`
            FROM \`chat_flow\`;`
        )
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {
        // This migration is intentionally not reversible.
        // Data migrations involving complex transformations should not be rolled back automatically.
        // The original chat_flow table remains intact, so no data is lost.
        // If you need to revert, restore from a database backup taken before the migration.
    }
}
