import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddGitConfig1751035139965 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'CREATE TABLE IF NOT EXISTS `git_config` (' +
            ' `id` varchar(36) PRIMARY KEY,' +
            ' `organizationId` varchar(36),' +
            ' `provider` varchar(32) NOT NULL DEFAULT \'github\',' +
            ' `repository` text NOT NULL,' +
            ' `authMode` varchar(16) NOT NULL DEFAULT \'token\',' +
            ' `username` varchar(100) NOT NULL,' +
            ' `secret` text NOT NULL,' +
            ' `branchName` varchar(100) DEFAULT \'main\',' +
            ' `isActive` boolean DEFAULT false,' +
            ' `createdDate` datetime DEFAULT CURRENT_TIMESTAMP,' +
            ' `updatedDate` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,' +
            ' `createdBy` varchar(36) NOT NULL,' +
            ' `updatedBy` varchar(36) NOT NULL,' +
            ' CONSTRAINT `fk_gitconfig_organizationId` FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`),' +
            ' CONSTRAINT `fk_gitconfig_createdBy` FOREIGN KEY (`createdBy`) REFERENCES `user`(`id`),' +
            ' CONSTRAINT `fk_gitconfig_updatedBy` FOREIGN KEY (`updatedBy`) REFERENCES `user`(`id`)' +
            ' );'
        );

        // Add columns to chat_flow table
        await queryRunner.query(
            'ALTER TABLE `chat_flow` ' +
            'ADD COLUMN `lastPublishedAt` datetime NULL, ' +
            'ADD COLUMN `lastPublishedCommit` varchar(255) NULL, ' +
            'ADD COLUMN `isDirty` boolean DEFAULT true;'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove columns from chat_flow table
        await queryRunner.query(
            'ALTER TABLE `chat_flow` ' +
            'DROP COLUMN `lastPublishedAt`, ' +
            'DROP COLUMN `lastPublishedCommit`, ' +
            'DROP COLUMN `isDirty`;'
        );
        
        await queryRunner.query('DROP TABLE IF EXISTS `git_config`;');
    }
} 