import { StatusCodes } from 'http-status-codes'
import bcrypt from 'bcryptjs'
import { InternalFlowiseError } from '../../../errors/internalFlowiseError'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import { CustomUser, CustomUserStatus } from '../../database/entities/CustomUser'
import { DataSource, QueryRunner } from 'typeorm'
import { generateId } from '../../../utils'

export const enum CustomUserErrorMessage {
    EXPIRED_TEMP_TOKEN = 'Expired Temporary Token',
    INVALID_TEMP_TOKEN = 'Invalid Temporary Token',
    INVALID_USER_ID = 'Invalid User Id',
    INVALID_USER_EMAIL = 'Invalid User Email',
    INVALID_USER_CREDENTIAL = 'Invalid User Credential',
    INVALID_USER_NAME = 'Invalid User Name',
    INVALID_USER_STATUS = 'Invalid User Status',
    USER_EMAIL_ALREADY_EXISTS = 'User Email Already Exists',
    USER_EMAIL_UNVERIFIED = 'User Email Unverified',
    USER_NOT_FOUND = 'User Not Found',
    USER_FOUND_MULTIPLE = 'User Found Multiple',
    INCORRECT_USER_EMAIL_OR_CREDENTIALS = 'Incorrect Email or Password'
}

export class CustomUserService {
    private dataSource: DataSource

    constructor() {
        const appServer = getRunningExpressApp()
        this.dataSource = appServer.AppDataSource
    }

    public validateUserId(id: string | undefined) {
        if (!id || typeof id !== 'string' || id.length === 0) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomUserErrorMessage.INVALID_USER_ID)
        }
    }

    public async readUserById(id: string | undefined, queryRunner: QueryRunner) {
        this.validateUserId(id)
        return await queryRunner.manager.findOneBy(CustomUser, { id })
    }

    public validateUserName(name: string | undefined) {
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomUserErrorMessage.INVALID_USER_NAME)
        }
    }

    public validateUserEmail(email: string | undefined) {
        if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomUserErrorMessage.INVALID_USER_EMAIL)
        }
    }

    public async readUserByEmail(email: string | undefined, queryRunner: QueryRunner) {
        this.validateUserEmail(email)
        return await queryRunner.manager.findOneBy(CustomUser, { email })
    }

    public validateUserStatus(status: string | undefined) {
        if (status && !Object.values(CustomUserStatus).includes(status as CustomUserStatus)) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomUserErrorMessage.INVALID_USER_STATUS)
        }
    }

    public async getAllUsers(queryRunner: QueryRunner) {
        return await queryRunner.manager.createQueryBuilder(CustomUser, 'user')
            .select(['user.id', 'user.name', 'user.email', 'user.status', 'user.createdDate', 'user.updatedDate'])
            .where('user.status != :deletedStatus', { deletedStatus: CustomUserStatus.DELETED })
            .orderBy('user.createdDate', 'DESC')
            .getMany()
    }

    public encryptUserCredential(credential: string | undefined) {
        if (!credential || credential.length < 6) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Password must be at least 6 characters long')
        }
        const salt = bcrypt.genSaltSync(10)
        return bcrypt.hashSync(credential, salt)
    }

    public async createNewUser(data: Partial<CustomUser>, queryRunner: QueryRunner) {
        const existingUser = await this.readUserByEmail(data.email, queryRunner)
        if (existingUser) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomUserErrorMessage.USER_EMAIL_ALREADY_EXISTS)
        }

        if (data.credential) {
            data.credential = this.encryptUserCredential(data.credential)
        }

        if (!data.name) data.name = data.email
        this.validateUserName(data.name)

        if (data.status) this.validateUserStatus(data.status)
        else data.status = CustomUserStatus.ACTIVE

        data.id = generateId()
        data.createdBy = data.id
        data.updatedBy = data.id

        return queryRunner.manager.create(CustomUser, data)
    }

    public async saveUser(data: Partial<CustomUser>, queryRunner: QueryRunner) {
        return await queryRunner.manager.save(CustomUser, data)
    }

    public async createUser(data: Partial<CustomUser>) {
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

        // Remove sensitive data before returning
        delete newUser.credential
        delete newUser.tempToken
        return newUser
    }

    public async updateUser(userData: Partial<CustomUser> & { password?: string }) {
        let queryRunner: QueryRunner | undefined
        let updatedUser: Partial<CustomUser>

        try {
            queryRunner = this.dataSource.createQueryRunner()
            await queryRunner.connect()

            const existingUser = await this.readUserById(userData.id, queryRunner)
            if (!existingUser) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, CustomUserErrorMessage.USER_NOT_FOUND)
            }

            if (userData.name) {
                this.validateUserName(userData.name)
            }

            if (userData.status) {
                this.validateUserStatus(userData.status)
            }

            if (userData.password) {
                userData.credential = this.encryptUserCredential(userData.password)
                delete userData.password
            }

            userData.updatedBy = existingUser.id

            updatedUser = queryRunner.manager.merge(CustomUser, existingUser, userData)

            await queryRunner.startTransaction()
            await this.saveUser(updatedUser, queryRunner)
            await queryRunner.commitTransaction()
        } catch (error) {
            if (queryRunner && queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction()
            }
            throw error
        } finally {
            if (queryRunner && !queryRunner.isReleased) {
                await queryRunner.release()
            }
        }

        // Remove sensitive data before returning
        delete updatedUser.credential
        delete updatedUser.tempToken
        return updatedUser
    }

    public async deleteUser(id: string) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        try {
            const user = await this.readUserById(id, queryRunner)
            if (!user) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, CustomUserErrorMessage.USER_NOT_FOUND)
            }

            await queryRunner.startTransaction()
            
            // Soft delete by updating status instead of hard delete
            user.status = CustomUserStatus.DELETED
            user.updatedBy = user.id
            await this.saveUser(user, queryRunner)
            
            await queryRunner.commitTransaction()

            return { message: 'User deleted successfully' }
        } catch (error) {
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction()
            }
            throw error
        } finally {
            await queryRunner.release()
        }
    }
}
