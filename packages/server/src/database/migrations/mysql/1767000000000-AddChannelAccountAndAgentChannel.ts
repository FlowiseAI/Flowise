import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddChannelAccountAndAgentChannel1767000000000 implements MigrationInterface {
    name = 'AddChannelAccountAndAgentChannel1767000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS \`channel_account\` (
                \`id\` varchar(36) NOT NULL,
                \`name\` varchar(255) NOT NULL,
                \`provider\` varchar(32) NOT NULL,
                \`credentialId\` varchar(36) NOT NULL,
                \`config\` text NULL,
                \`enabled\` tinyint NOT NULL DEFAULT 1,
                \`workspaceId\` text NOT NULL,
                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
            );`
        )
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS \`agent_channel\` (
                \`id\` varchar(36) NOT NULL,
                \`chatflowId\` varchar(36) NOT NULL,
                \`channelAccountId\` varchar(36) NOT NULL,
                \`provider\` varchar(32) NOT NULL,
                \`webhookPath\` varchar(255) NOT NULL,
                \`enabled\` tinyint NOT NULL DEFAULT 1,
                \`workspaceId\` text NOT NULL,
                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
            );`
        )
        await queryRunner.query(`CREATE INDEX \`IDX_channel_account_provider\` ON \`channel_account\` (\`provider\`)`)
        await queryRunner.query(`CREATE INDEX \`IDX_agent_channel_chatflowid\` ON \`agent_channel\` (\`chatflowId\`)`)
        await queryRunner.query(`CREATE INDEX \`IDX_agent_channel_channelaccountid\` ON \`agent_channel\` (\`channelAccountId\`)`)
        await queryRunner.query(`CREATE INDEX \`IDX_agent_channel_provider\` ON \`agent_channel\` (\`provider\`)`)
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_agent_channel_webhookpath\` ON \`agent_channel\` (\`webhookPath\`)`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_agent_channel_webhookpath\` ON \`agent_channel\``)
        await queryRunner.query(`DROP INDEX \`IDX_agent_channel_provider\` ON \`agent_channel\``)
        await queryRunner.query(`DROP INDEX \`IDX_agent_channel_channelaccountid\` ON \`agent_channel\``)
        await queryRunner.query(`DROP INDEX \`IDX_agent_channel_chatflowid\` ON \`agent_channel\``)
        await queryRunner.query(`DROP INDEX \`IDX_channel_account_provider\` ON \`channel_account\``)
        await queryRunner.query(`DROP TABLE IF EXISTS \`agent_channel\``)
        await queryRunner.query(`DROP TABLE IF EXISTS \`channel_account\``)
    }
}
