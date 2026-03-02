import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddChannelAccountAndAgentChannel1767000000000 implements MigrationInterface {
    name = 'AddChannelAccountAndAgentChannel1767000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "channel_account" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" varchar NOT NULL,
                "provider" varchar(32) NOT NULL,
                "credentialId" uuid NOT NULL,
                "config" text NULL,
                "enabled" boolean NOT NULL DEFAULT true,
                "workspaceId" text NOT NULL,
                "createdDate" timestamp NOT NULL DEFAULT now(),
                "updatedDate" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_channel_account" PRIMARY KEY ("id")
            );`
        )
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "agent_channel" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "chatflowId" uuid NOT NULL,
                "channelAccountId" uuid NOT NULL,
                "provider" varchar(32) NOT NULL,
                "webhookPath" varchar(255) NOT NULL,
                "enabled" boolean NOT NULL DEFAULT true,
                "workspaceId" text NOT NULL,
                "createdDate" timestamp NOT NULL DEFAULT now(),
                "updatedDate" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_agent_channel" PRIMARY KEY ("id")
            );`
        )
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_channel_account_provider" ON "channel_account" ("provider")`)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_agent_channel_chatflowid" ON "agent_channel" ("chatflowId")`)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_agent_channel_channelaccountid" ON "agent_channel" ("channelAccountId")`)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_agent_channel_provider" ON "agent_channel" ("provider")`)
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_agent_channel_webhookpath" ON "agent_channel" ("webhookPath")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agent_channel_webhookpath"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agent_channel_provider"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agent_channel_channelaccountid"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agent_channel_chatflowid"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_channel_account_provider"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "agent_channel"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "channel_account"`)
    }
}
