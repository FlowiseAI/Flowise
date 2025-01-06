import { MigrationInterface, QueryRunner } from 'typeorm'

export class UpdateUserIDChatFlow1735802580229 implements MigrationInterface {
  name = 'UpdateUserIDChatFlow1735802580229'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if userid column exists, if not create it, fuck you @Huy
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'chat_flow' AND column_name = 'userid'
        ) THEN
          ALTER TABLE "chat_flow" ADD COLUMN "userid" uuid;
        END IF;
      END $$;
    `)

    // Proceed with the rename
    await queryRunner.query(`ALTER TABLE "chat_flow" RENAME COLUMN "userid" TO "userId"`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chat_flow" RENAME COLUMN "userId" TO "userid"`)
  }
}
