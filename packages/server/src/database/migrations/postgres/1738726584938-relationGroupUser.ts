import { MigrationInterface, QueryRunner } from 'typeorm'

export class RelationGroupUser1738726584938 implements MigrationInterface {
  name = 'RelationGroupUser1738726584938'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_a6d948d4851cbb3cc68c67247ad" FOREIGN KEY ("groupname") REFERENCES "group_users"("groupname") ON DELETE NO ACTION ON UPDATE NO ACTION`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_a6d948d4851cbb3cc68c67247ad"`)
  }
}
