import { MigrationInterface, QueryRunner } from 'typeorm'

export class Init1693891895163 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS chat_flow (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" varchar NOT NULL,
                "flowData" text NOT NULL,
                deployed bool NULL,
                "isPublic" bool NULL,
                apikeyid varchar NULL,
                "chatbotConfig" varchar NULL,
                "createdDate" timestamp NOT NULL DEFAULT now(),
                "updatedDate" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_3c7cea7d047ac4b91764574cdbf" PRIMARY KEY (id)
            );`
        )
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS chat_message (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "role" varchar NOT NULL,
                chatflowid varchar NOT NULL,
                "content" text NOT NULL,
                "sourceDocuments" varchar NULL,
                "createdDate" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_3cc0d85193aade457d3077dd06b" PRIMARY KEY (id)
            );`
        )
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_e574527322272fd838f4f0f3d3" ON chat_message USING btree ("chatflowid");`)
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS credential (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" varchar NOT NULL,
                "credentialName" varchar NOT NULL,
                "encryptedData" varchar NOT NULL,
                "createdDate" timestamp NOT NULL DEFAULT now(),
                "updatedDate" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_3a5169bcd3d5463cefeec78be82" PRIMARY KEY (id)
            );`
        )
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS tool (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" varchar NOT NULL,
                description text NOT NULL,
                color varchar NOT NULL,
                "iconSrc" varchar NULL,
                "schema" varchar NULL,
                func varchar NULL,
                "createdDate" timestamp NOT NULL DEFAULT now(),
                "updatedDate" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_3bf5b1016a384916073184f99b7" PRIMARY KEY (id)
            );`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE chat_flow`)
        await queryRunner.query(`DROP TABLE chat_message`)
        await queryRunner.query(`DROP TABLE credential`)
        await queryRunner.query(`DROP TABLE tool`)
    }
}
