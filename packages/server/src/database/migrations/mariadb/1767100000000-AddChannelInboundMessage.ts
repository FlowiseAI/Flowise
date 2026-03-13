import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddChannelInboundMessage1767100000000 implements MigrationInterface {
    name = 'AddChannelInboundMessage1767100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS \`channel_inbound_message\` (
                \`id\` varchar(36) NOT NULL,
                \`provider\` varchar(32) NOT NULL,
                \`channelAccountId\` varchar(36) NOT NULL,
                \`externalMessageId\` varchar(255) NOT NULL,
                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
            );`
        )
        await queryRunner.query(
            `CREATE UNIQUE INDEX \`UQ_channel_inbound_message_provider_account_external\` ON \`channel_inbound_message\` (\`provider\`, \`channelAccountId\`, \`externalMessageId\`)`
        )
        await queryRunner.query(
            `CREATE INDEX \`IDX_channel_inbound_message_provider\` ON \`channel_inbound_message\` (\`provider\`)`
        )
        await queryRunner.query(
            `CREATE INDEX \`IDX_channel_inbound_message_channelaccountid\` ON \`channel_inbound_message\` (\`channelAccountId\`)`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DROP INDEX \`IDX_channel_inbound_message_channelaccountid\` ON \`channel_inbound_message\``
        )
        await queryRunner.query(`DROP INDEX \`IDX_channel_inbound_message_provider\` ON \`channel_inbound_message\``)
        await queryRunner.query(
            `DROP INDEX \`UQ_channel_inbound_message_provider_account_external\` ON \`channel_inbound_message\``
        )
        await queryRunner.query(`DROP TABLE IF EXISTS \`channel_inbound_message\``)
    }
}
