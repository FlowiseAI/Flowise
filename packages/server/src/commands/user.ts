import { Args } from '@oclif/core'
import { QueryRunner } from 'typeorm'
import * as DataSource from '../DataSource'
import { User } from '../enterprise/database/entities/user.entity'
import { getHash } from '../enterprise/utils/encryption.util'
import { isInvalidPassword } from '../enterprise/utils/validation.util'
import logger from '../utils/logger'
import { BaseCommand } from './base'

export default class user extends BaseCommand {
    static args = {
        email: Args.string({
            description: 'Email address to search for in the user database'
        }),
        password: Args.string({
            description: 'New password for that user'
        })
    }

    async run(): Promise<void> {
        const { args } = await this.parse(user)

        let queryRunner: QueryRunner | undefined
        try {
            logger.info('Initializing DataSource')
            const dataSource = await DataSource.getDataSource()
            await dataSource.initialize()

            queryRunner = dataSource.createQueryRunner()
            await queryRunner.connect()

            if (args.email && args.password) {
                logger.info('Running resetPassword')
                await this.resetPassword(queryRunner, args.email, args.password)
            } else {
                logger.info('Running listUserEmails')
                await this.listUserEmails(queryRunner)
            }
        } catch (error) {
            logger.error(error)
        } finally {
            if (queryRunner && !queryRunner.isReleased) await queryRunner.release()
            await this.gracefullyExit()
        }
    }

    async listUserEmails(queryRunner: QueryRunner) {
        logger.info('Listing all user emails')
        const users = await queryRunner.manager.find(User, {
            select: ['email']
        })

        const emails = users.map((user) => user.email)
        logger.info(`Email addresses: ${emails.join(', ')}`)
        logger.info(`Email count: ${emails.length}`)
        logger.info('To reset user password, run the following command: pnpm user --email "myEmail" --password "myPassword"')
    }

    async resetPassword(queryRunner: QueryRunner, email: string, password: string) {
        logger.info(`Finding user by email: ${email}`)
        const user = await queryRunner.manager.findOne(User, {
            where: { email }
        })
        if (!user) throw new Error(`User not found with email: ${email}`)

        if (isInvalidPassword(password)) {
            const errors = []
            if (!/(?=.*[a-z])/.test(password)) errors.push('at least one lowercase letter')
            if (!/(?=.*[A-Z])/.test(password)) errors.push('at least one uppercase letter')
            if (!/(?=.*\d)/.test(password)) errors.push('at least one number')
            if (!/(?=.*[^a-zA-Z0-9])/.test(password)) errors.push('at least one special character')
            if (password.length < 8) errors.push('minimum length of 8 characters')
            throw new Error(`Invalid password: Must contain ${errors.join(', ')}`)
        }

        user.credential = getHash(password)
        await queryRunner.manager.save(user)
        logger.info(`Password reset for user: ${email}`)
    }
}
