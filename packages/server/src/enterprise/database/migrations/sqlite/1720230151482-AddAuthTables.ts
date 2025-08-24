import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAuthTables1720230151482 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "user" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "role" varchar NOT NULL, 
                "name" varchar, 
                "credential" text, 
                "tempToken" text, 
                "tokenExpiry" datetime,
                "email" varchar NOT NULL, 
                "status" varchar NOT NULL, 
                "activeWorkspaceId" varchar NOT NULL, 
                "lastLogin" datetime);`
        )
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "roles" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "name" varchar, 
                "description" varchar, 
                "permissions" text);`
        )
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "login_activity" (
                "id" varchar PRIMARY KEY NOT NULL, 
                "username" varchar NOT NULL, 
                "activity_code" integer NOT NULL, 
                "message" varchar NOT NULL, 
                "attemptedDateTime" datetime NOT NULL DEFAULT (datetime('now')));`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE user`)
        await queryRunner.query(`DROP TABLE roles`)
        await queryRunner.query(`DROP TABLE login_activity`)
    }
}
