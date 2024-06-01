import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUser1716422641414 implements MigrationInterface {
    name = 'AddUser1716422641414'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE \`user\` (\`id\` CHAR(36) NOT NULL, \`auth0Id\` VARCHAR(255) NOT NULL, \`email\` VARCHAR(255) NOT NULL, \`name\` VARCHAR(255), \`createdDate\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updatedDate\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`))`
        )
        await queryRunner.query(`ALTER TABLE \`chat_flow\` ADD \`userId\` CHAR(36)`)
        await queryRunner.query(`ALTER TABLE \`chat_message\` ADD \`userId\` CHAR(36)`)
        await queryRunner.query(`ALTER TABLE \`credential\` ADD \`userId\` CHAR(36)`)
        await queryRunner.query(`ALTER TABLE \`assistant\` ADD \`userId\` CHAR(36)`)
        await queryRunner.query(`ALTER TABLE \`chat_message_feedback\` ADD \`userId\` CHAR(36)`)
        await queryRunner.query(`CREATE INDEX \`IDX_eabfcfed8674ccc376ac2ed5e3\` ON \`chat_flow\` (\`userId\`)`)
        await queryRunner.query(`CREATE INDEX \`IDX_a44ec486210e6f8b4591776d6f\` ON \`chat_message\` (\`userId\`)`)
        await queryRunner.query(`CREATE INDEX \`IDX_51dc2344d47cea3102674c6496\` ON \`credential\` (\`userId\`)`)
        await queryRunner.query(`CREATE INDEX \`IDX_b67bf802f4a770fe60f3185fe1\` ON \`assistant\` (\`userId\`)`)
        await queryRunner.query(`CREATE INDEX \`IDX_b86c8a67f6262553911dc950f4\` ON \`chat_message_feedback\` (\`userId\`)`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`user\``)
        await queryRunner.query(`DROP INDEX \`IDX_b86c8a67f6262553911dc950f4\` ON \`chat_message_feedback\``)
        await queryRunner.query(`DROP INDEX \`IDX_b67bf802f4a770fe60f3185fe1\` ON \`assistant\``)
        await queryRunner.query(`DROP INDEX \`IDX_51dc2344d47cea3102674c6496\` ON \`credential\``)
        await queryRunner.query(`DROP INDEX \`IDX_a44ec486210e6f8b4591776d6f\` ON \`chat_message\``)
        await queryRunner.query(`DROP INDEX \`IDX_eabfcfed8674ccc376ac2ed5e3\` ON \`chat_flow\``)
        await queryRunner.query(`ALTER TABLE \`chat_message_feedback\` DROP COLUMN \`userId\``)
        await queryRunner.query(`ALTER TABLE \`assistant\` DROP COLUMN \`userId\``)
        await queryRunner.query(`ALTER TABLE \`credential\` DROP COLUMN \`userId\``)
        await queryRunner.query(`ALTER TABLE \`chat_message\` DROP COLUMN \`userId\``)
        await queryRunner.query(`ALTER TABLE \`chat_flow\` DROP COLUMN \`userId\``)
    }
}
