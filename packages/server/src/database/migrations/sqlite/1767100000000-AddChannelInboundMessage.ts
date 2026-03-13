import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddChannelInboundMessage1767100000000 implements MigrationInterface {
    name = 'AddChannelInboundMessage1767100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "channel_inbound_message" (
                "id" varchar PRIMARY KEY NOT NULL,
                "provider" varchar(32) NOT NULL,
                "channelAccountId" varchar NOT NULL,
                "externalMessageId" varchar(255) NOT NULL,
                "createdDate" datetime NOT NULL DEFAULT (datetime('now'))
            );`
        )
        await queryRunner.query(
            `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_channel_inbound_message_provider_account_external" ON "channel_inbound_message" ("provider", "channelAccountId", "externalMessageId")`
        )
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_channel_inbound_message_provider" ON "channel_inbound_message" ("provider")`
        )
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_channel_inbound_message_channelaccountid" ON "channel_inbound_message" ("channelAccountId")`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_channel_inbound_message_channelaccountid"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_channel_inbound_message_provider"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "UQ_channel_inbound_message_provider_account_external"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "channel_inbound_message"`)
    }
}
