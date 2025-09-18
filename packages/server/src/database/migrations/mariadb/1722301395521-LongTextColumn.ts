import { MigrationInterface, QueryRunner } from 'typeorm'

export class LongTextColumn1722301395521 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chat_flow\` MODIFY \`flowData\` LONGTEXT;`)
        await queryRunner.query(`ALTER TABLE \`chat_message\` MODIFY \`content\` LONGTEXT;`)
        await queryRunner.query(`ALTER TABLE \`chat_message\` MODIFY \`usedTools\` LONGTEXT;`)
        await queryRunner.query(`ALTER TABLE \`document_store\` MODIFY \`loaders\` LONGTEXT;`)
        await queryRunner.query(`ALTER TABLE \`upsert_history\` MODIFY \`flowData\` LONGTEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chat_flow\` MODIFY \`flowData\` TEXT;`)
        await queryRunner.query(`ALTER TABLE \`chat_message\` MODIFY \`content\` TEXT;`)
        await queryRunner.query(`ALTER TABLE \`chat_message\` MODIFY \`usedTools\` TEXT;`)
        await queryRunner.query(`ALTER TABLE \`document_store\` MODIFY \`loaders\` TEXT;`)
        await queryRunner.query(`ALTER TABLE \`upsert_history\` MODIFY \`flowData\` TEXT;`)
    }
}
