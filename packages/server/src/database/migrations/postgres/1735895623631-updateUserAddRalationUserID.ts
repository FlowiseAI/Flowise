import { MigrationInterface, QueryRunner } from 'typeorm'

export class UpdateUserAddRalationUserID1735895623631 implements MigrationInterface {
  name = 'UpdateUserAddRalationUserID1735895623631'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat_flow" ADD CONSTRAINT "FK_eabfcfed8674ccc376ac2ed5e30" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chat_flow" DROP CONSTRAINT "FK_eabfcfed8674ccc376ac2ed5e30"`)
  }
}
