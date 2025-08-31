import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddTagsAndDescriptionToChatFlow1716400000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // SQLite allows adding one column per ALTER statement
        const hasTags = await queryRunner.hasColumn('chat_flow', 'tags')
        if (!hasTags) {
            await queryRunner.query(`ALTER TABLE "chat_flow" ADD COLUMN "tags" TEXT`)
        }

        const hasDescription = await queryRunner.hasColumn('chat_flow', 'description')
        if (!hasDescription) {
            await queryRunner.query(`ALTER TABLE "chat_flow" ADD COLUMN "description" TEXT`)
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }
}
