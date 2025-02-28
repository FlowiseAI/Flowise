import { MigrationInterface, QueryRunner } from 'typeorm'

export class BillingSchemaEnhancement1740447708857 implements MigrationInterface {
    name = 'BillingSchemaEnhancement1740447708857'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "subscription" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "entityType" character varying(50) NOT NULL, "entityId" uuid NOT NULL, "organizationId" uuid, "subscriptionType" character varying(50) NOT NULL, "stripeSubscriptionId" character varying NOT NULL, "stripeSubscriptionItemId" character varying NOT NULL, "status" character varying NOT NULL, "creditsLimit" integer NOT NULL, "currentPeriodStart" TIMESTAMP WITH TIME ZONE NOT NULL, "currentPeriodEnd" TIMESTAMP WITH TIME ZONE NOT NULL, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_77dbeeb547dcfa35907431005b4" UNIQUE ("stripeSubscriptionId"), CONSTRAINT "UQ_878a57bea0296b7a90a67f10f5e" UNIQUE ("stripeSubscriptionItemId"), CONSTRAINT "UQ_c56e60bc943bbf16bff5967b6f7" UNIQUE ("entityType", "entityId"), CONSTRAINT "PK_8c3e00ebd02103caa1174cd5d9d" PRIMARY KEY ("id"))`
        )
        await queryRunner.query(`CREATE INDEX "IDX_adccc182c138222d2fc5404cfe" ON "subscription" ("entityType") `)
        await queryRunner.query(`CREATE INDEX "IDX_404bc7ad0e4734744372d656fe" ON "subscription" ("entityId") `)
        await queryRunner.query(`CREATE INDEX "IDX_8ccdfc22892c16950b568145d5" ON "subscription" ("organizationId") `)
        await queryRunner.query(
            `CREATE TABLE "usage_event" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "entityType" character varying(50) NOT NULL, "entityId" uuid NOT NULL, "organizationId" uuid, "resourceType" character varying(50) NOT NULL, "quantity" integer NOT NULL, "creditsConsumed" integer NOT NULL, "stripeMeterEventId" character varying, "traceId" character varying, "metadata" jsonb, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_797d3f1dfd307095af5e4fd8457" PRIMARY KEY ("id"))`
        )
        await queryRunner.query(`CREATE INDEX "IDX_2077b438c7d5d48881c421dcc8" ON "usage_event" ("entityType") `)
        await queryRunner.query(`CREATE INDEX "IDX_dfa5f891e7bc640519201dc148" ON "usage_event" ("entityId") `)
        await queryRunner.query(`CREATE INDEX "IDX_f55608e2ecbb73851d47bdca71" ON "usage_event" ("organizationId") `)
        await queryRunner.query(`CREATE INDEX "IDX_60859f43a55aa0a2cfec014a9c" ON "usage_event" ("entityType", "entityId", "createdDate") `)
        await queryRunner.query(`CREATE INDEX "IDX_adc16872e0c96cca911ba0cbd3" ON "usage_event" ("organizationId", "createdDate") `)
        await queryRunner.query(`CREATE INDEX "IDX_trace_id_lookup" ON "usage_event" ("traceId") `)
        await queryRunner.query(
            `CREATE TABLE "blocking_status" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "entityType" character varying(50) NOT NULL, "entityId" uuid NOT NULL, "organizationId" uuid, "isBlocked" boolean NOT NULL DEFAULT false, "reason" character varying, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_c18f866034d2072d52c8020e7ac" UNIQUE ("entityType", "entityId"), CONSTRAINT "PK_b360b38c547d299bd3207935b7c" PRIMARY KEY ("id"))`
        )
        await queryRunner.query(`CREATE INDEX "IDX_82e5717557bcee0ae66291863d" ON "blocking_status" ("entityType") `)
        await queryRunner.query(`CREATE INDEX "IDX_46b358af2c6024a5b7b293de89" ON "blocking_status" ("entityId") `)
        await queryRunner.query(`CREATE INDEX "IDX_75a323d637f69648fd405ad770" ON "blocking_status" ("organizationId") `)
        await queryRunner.query(
            `CREATE TABLE "stripe_event" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "stripeEventId" character varying NOT NULL, "eventType" character varying NOT NULL, "eventData" jsonb NOT NULL, "processed" boolean NOT NULL DEFAULT false, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e346c225221ea580307a359231c" UNIQUE ("stripeEventId"), CONSTRAINT "PK_7a91ab435defe9ce0ee6fb6f7f7" PRIMARY KEY ("id"))`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "stripe_event"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_75a323d637f69648fd405ad770"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_46b358af2c6024a5b7b293de89"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_82e5717557bcee0ae66291863d"`)
        await queryRunner.query(`DROP TABLE "blocking_status"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_adc16872e0c96cca911ba0cbd3"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_60859f43a55aa0a2cfec014a9c"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_f55608e2ecbb73851d47bdca71"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_dfa5f891e7bc640519201dc148"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_2077b438c7d5d48881c421dcc8"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_trace_id_lookup"`)
        await queryRunner.query(`DROP TABLE "usage_event"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_8ccdfc22892c16950b568145d5"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_404bc7ad0e4734744372d656fe"`)
        await queryRunner.query(`DROP INDEX "public"."IDX_adccc182c138222d2fc5404cfe"`)
        await queryRunner.query(`DROP TABLE "subscription"`)
    }
}
