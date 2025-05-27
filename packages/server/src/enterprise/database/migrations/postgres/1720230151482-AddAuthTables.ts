import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAuthTables1720230151482 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "user" (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" varchar,
                "role" varchar NOT NULL,
                "credential" text,
                "tempToken" text,
                "tokenExpiry" timestamp,
                "email" varchar NOT NULL,
                "status" varchar NOT NULL,
                "activeWorkspaceId" varchar,
                "lastLogin" timestamp,
                CONSTRAINT "PK_98455643dd334f54-9830ab78f9" PRIMARY KEY (id)
            );`
        )
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "roles" (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" varchar,
                "description" varchar,
                "permissions" text,
                CONSTRAINT "PK_98488643dd3554f54-9830ab78f9" PRIMARY KEY (id)
            );`
        )
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "login_activity" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "username" varchar NOT NULL, 
                "activity_code" integer NOT NULL, 
                "message" varchar NOT NULL, 
                "attemptedDateTime" timestamp NOT NULL DEFAULT now());`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE user`)
        await queryRunner.query(`DROP TABLE roles`)
        await queryRunner.query(`DROP TABLE login_history`)
    }
}
