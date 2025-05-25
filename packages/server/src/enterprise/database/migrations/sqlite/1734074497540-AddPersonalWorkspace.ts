import { MigrationInterface, QueryRunner } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'

export class AddPersonalWorkspace1734074497540 implements MigrationInterface {
    name = 'AddPersonalWorkspace1734074497540'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const users = await queryRunner.query(`select * from "user";`)
        const organization = await queryRunner.query(`select "id" from "organization";`)
        for (let user of users) {
            const workspaceDescription = 'Personal Workspace of ' + user.id
            const workspaceId = uuidv4()

            await queryRunner.query(`
                insert into "workspace" ("id", "name", "description", "organizationId")
                values('${workspaceId}', 'Personal Workspace', '${workspaceDescription}', '${organization[0].id}');
            `)

            const workspaceusersId = uuidv4()
            await queryRunner.query(`
                insert into "workspace_users" ("id", "workspaceId", "userId", "role")
                values('${workspaceusersId}', '${workspaceId}', '${user.id}', 'pw');
            `)
        }
    }

    public async down(): Promise<void> {}
}
