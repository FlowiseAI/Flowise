import { MigrationInterface, QueryRunner } from 'typeorm'

export class Init1693840429259 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE \`chat_flow\` (
                \`id\` varchar(36) NOT NULL,
                \`name\` varchar(255) NOT NULL,
                \`flowData\` text NOT NULL,
                \`deployed\` tinyint DEFAULT NULL,
                \`isPublic\` tinyint DEFAULT NULL,
                \`apikeyid\` varchar(255) DEFAULT NULL,
                \`chatbotConfig\` text,
                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`
        )
        await queryRunner.query(
            `CREATE TABLE \`chat_message\` (
                \`id\` varchar(36) NOT NULL,
                \`role\` varchar(255) NOT NULL,
                \`chatflowid\` varchar(255) NOT NULL,
                \`content\` text NOT NULL,
                \`sourceDocuments\` text,
                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                KEY \`IDX_e574527322272fd838f4f0f3d3\` (\`chatflowid\`)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`
        )
        await queryRunner.query(
            `CREATE TABLE \`credential\` (
                \`id\` varchar(36) NOT NULL,
                \`name\` varchar(255) NOT NULL,
                \`credentialName\` varchar(255) NOT NULL,
                \`encryptedData\` text NOT NULL,
                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`
        )
        await queryRunner.query(
            `CREATE TABLE \`tool\` (
                \`id\` varchar(36) NOT NULL,
                \`name\` varchar(255) NOT NULL,
                \`description\` text NOT NULL,
                \`color\` varchar(255) NOT NULL,
                \`iconSrc\` varchar(255) DEFAULT NULL,
                \`schema\` text,
                \`func\` text,
                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE chat_flow`)
        await queryRunner.query(`DROP TABLE chat_message`)
        await queryRunner.query(`DROP TABLE credential`)
        await queryRunner.query(`DROP TABLE tool`)
    }
}
