import { StatusCodes } from 'http-status-codes'
import { DataSource, ILike, QueryRunner } from 'typeorm'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { generateId } from '../../utils'
import { GeneralErrorMessage } from '../../utils/constants'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import logger from '../../utils/logger'
import { sanitizeUser } from '../../utils/sanitize.util'
import { Telemetry, TelemetryEventType } from '../../utils/telemetry'
import { Platform } from '../../Interface'
import { User, UserStatus } from '../database/entities/user.entity'
import { destroyAllSessionsForUser } from '../middleware/passport/SessionPersistance'
import { compareHash, getHash } from '../utils/encryption.util'
import { isInvalidEmail, isInvalidName, isInvalidPassword, isInvalidUUID } from '../utils/validation.util'
import { OrganizationService } from './organization.service'
import { OrganizationUserService } from './organization-user.service'

export const enum UserErrorMessage {
    EXPIRED_TEMP_TOKEN = 'Expired Temporary Token',
    INVALID_TEMP_TOKEN = 'Invalid Temporary Token',
    INVALID_USER_ID = 'Invalid User Id',
    INVALID_USER_EMAIL = 'Invalid User Email',
    INVALID_USER_CREDENTIAL = 'Invalid User Credential',
    INVALID_USER_NAME = 'Invalid User Name',
    INVALID_USER_TYPE = 'Invalid User Type',
    INVALID_USER_STATUS = 'Invalid User Status',
    USER_EMAIL_ALREADY_EXISTS = 'User Email Already Exists',
    USER_EMAIL_UNVERIFIED = 'User Email Unverified',
    USER_NOT_FOUND = 'User Not Found',
    USER_FOUND_MULTIPLE = 'User Found Multiple',
    INCORRECT_USER_EMAIL_OR_CREDENTIALS = 'Incorrect Email or Password',
    PASSWORDS_DO_NOT_MATCH = 'Passwords do not match'
}
export class UserService {
    private telemetry: Telemetry
    private dataSource: DataSource

    constructor() {
        const appServer = getRunningExpressApp()
        this.dataSource = appServer.AppDataSource
        this.telemetry = appServer.telemetry
    }

    public validateUserId(id: string | undefined) {
        if (isInvalidUUID(id)) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.INVALID_USER_ID)
    }

    public async readUserById(id: string | undefined, queryRunner: QueryRunner) {
        this.validateUserId(id)
        return await queryRunner.manager.findOneBy(User, { id })
    }

    public validateUserName(name: string | undefined) {
        if (isInvalidName(name)) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.INVALID_USER_NAME)
    }

    public validateUserEmail(email: string | undefined) {
        if (isInvalidEmail(email)) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.INVALID_USER_EMAIL)
    }

    public async readUserByEmail(email: string | undefined, queryRunner: QueryRunner) {
        if (!email) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.INVALID_USER_EMAIL)
        this.validateUserEmail(email)
        return await queryRunner.manager.findOneBy(User, { email: ILike(email) })
    }

    public async readUserByToken(token: string | undefined, queryRunner: QueryRunner) {
        return await queryRunner.manager.findOneBy(User, { tempToken: token })
    }

    public validateUserStatus(status: string | undefined) {
        if (status && !Object.values(UserStatus).includes(status as UserStatus))
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.INVALID_USER_STATUS)
    }

    public async readUser(queryRunner: QueryRunner) {
        return await queryRunner.manager.find(User)
    }

    public encryptUserCredential(credential: string | undefined) {
        if (!credential || isInvalidPassword(credential))
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, GeneralErrorMessage.INVALID_PASSWORD)
        return getHash(credential)
    }

    public async createNewUser(data: Partial<User>, queryRunner: QueryRunner) {
        const user = await this.readUserByEmail(data.email, queryRunner)
        if (user) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.USER_EMAIL_ALREADY_EXISTS)
        if (data.credential) data.credential = this.encryptUserCredential(data.credential)
        if (!data.name) data.name = data.email
        this.validateUserName(data.name)
        if (data.status) this.validateUserStatus(data.status)

        data.id = generateId()
        const createdById = data.createdBy
        if (createdById) {
            const createdByUser = await this.readUserById(createdById, queryRunner)
            if (!createdByUser) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
            data.createdBy = createdByUser.id
            data.updatedBy = data.createdBy
        } else {
            data.createdBy = data.id
            data.updatedBy = data.id
        }

        const userObj = queryRunner.manager.create(User, data)

        this.telemetry.sendTelemetry(
            TelemetryEventType.USER_CREATED,
            {
                userId: userObj.id,
                createdBy: userObj.createdBy
            },
            userObj.id
        )

        return userObj
    }

    public async saveUser(data: Partial<User>, queryRunner: QueryRunner) {
        return await queryRunner.manager.save(User, data)
    }

    public async createUser(data: Partial<User>) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        let newUser = await this.createNewUser(data, queryRunner)
        try {
            await queryRunner.startTransaction()
            newUser = await this.saveUser(newUser, queryRunner)
            await queryRunner.commitTransaction()
        } catch (error) {
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            await queryRunner.release()
        }

        return newUser
    }

    public async updateUser(newUserData: Partial<User> & { oldPassword?: string; newPassword?: string; confirmPassword?: string }) {
        let queryRunner: QueryRunner | undefined
        let updatedUser: Partial<User>
        try {
            queryRunner = this.dataSource.createQueryRunner()
            await queryRunner.connect()
            const oldUserData = await this.readUserById(newUserData.id, queryRunner)
            if (!oldUserData) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)

            const currentEmail = oldUserData.email

            if (newUserData.updatedBy) {
                const updateUserData = await this.readUserById(newUserData.updatedBy, queryRunner)
                if (!updateUserData) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
            }

            newUserData.createdBy = oldUserData.createdBy

            if (newUserData.name) {
                this.validateUserName(newUserData.name)
            }

            if (newUserData.status) {
                this.validateUserStatus(newUserData.status)
            }

            if (newUserData.oldPassword && newUserData.newPassword && newUserData.confirmPassword) {
                if (!oldUserData.credential) {
                    throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.INVALID_USER_CREDENTIAL)
                }
                // verify old password
                if (!compareHash(newUserData.oldPassword, oldUserData.credential)) {
                    throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.INVALID_USER_CREDENTIAL)
                }
                if (newUserData.newPassword !== newUserData.confirmPassword) {
                    throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.PASSWORDS_DO_NOT_MATCH)
                }
                newUserData.credential = this.encryptUserCredential(newUserData.newPassword)
                newUserData.tempToken = ''
                newUserData.tokenExpiry = undefined
            }

            updatedUser = queryRunner.manager.merge(User, oldUserData, newUserData)
            await queryRunner.startTransaction()
            await this.saveUser(updatedUser, queryRunner)
            await queryRunner.commitTransaction()

            // Invalidate all sessions for this user if password was changed
            if (newUserData.oldPassword && newUserData.newPassword && newUserData.confirmPassword) {
                await destroyAllSessionsForUser(updatedUser.id as string)
            }

            // Update Stripe customer email when user changes email (CLOUD only; expect exactly one org)
            const appServer = getRunningExpressApp()
            if (appServer.identityManager.getPlatformType() === Platform.CLOUD && updatedUser.email && updatedUser.email !== currentEmail) {
                const organizationUserService = new OrganizationUserService()
                const organizationService = new OrganizationService()
                let syncQueryRunner: QueryRunner | undefined
                try {
                    syncQueryRunner = this.dataSource.createQueryRunner()
                    await syncQueryRunner.connect()
                    const orgUsers = await organizationUserService.readOrganizationUserByUserId(updatedUser.id as string, syncQueryRunner)
                    const ownerOrgLinks = orgUsers.filter((ou) => ou.isOrgOwner)
                    if (ownerOrgLinks.length === 1) {
                        const org = await organizationService.readOrganizationById(ownerOrgLinks[0].organizationId, syncQueryRunner)
                        if (org?.customerId) {
                            await appServer.identityManager.updateStripeCustomerEmail(org.customerId, updatedUser.email as string)
                        }
                    }
                } catch (stripeError) {
                    logger.warn(`Failed to update Stripe customer email for user ${updatedUser.id}:`, stripeError)
                } finally {
                    if (syncQueryRunner && !syncQueryRunner.isReleased) await syncQueryRunner.release()
                }
            }
        } catch (error) {
            if (queryRunner && queryRunner.isTransactionActive) await queryRunner.rollbackTransaction()
            throw error
        } finally {
            if (queryRunner && !queryRunner.isReleased) await queryRunner.release()
        }

        return sanitizeUser(updatedUser)
    }
}
