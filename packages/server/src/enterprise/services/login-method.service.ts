import { DataSource, QueryRunner } from 'typeorm'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { isInvalidName, isInvalidUUID } from '../utils/validation.util'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { LoginMethod, LoginMethodStatus } from '../database/entities/login-method.entity'
import { decrypt, encrypt } from '../utils/encryption.util'
import { UserErrorMessage, UserService } from './user.service'
import { OrganizationErrorMessage, OrganizationService } from './organization.service'
import { IsNull } from 'typeorm'

export const enum LoginMethodErrorMessage {
    INVALID_LOGIN_METHOD_ID = 'Invalid Login Method Id',
    INVALID_LOGIN_METHOD_NAME = 'Invalid Login Method Name',
    INVALID_LOGIN_METHOD_STATUS = 'Invalid Login Method Status',
    INVALID_LOGIN_METHOD_CONFIG = 'Invalid Login Method Config',
    LOGIN_METHOD_NOT_FOUND = 'Login Method Not Found'
}

export class LoginMethodService {
    private dataSource: DataSource
    private userService: UserService
    private organizationService: OrganizationService

    constructor() {
        const appServer = getRunningExpressApp()
        this.dataSource = appServer.AppDataSource
        this.userService = new UserService()
        this.organizationService = new OrganizationService()
    }

    public validateLoginMethodId(id: string | undefined) {
        if (isInvalidUUID(id)) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, LoginMethodErrorMessage.INVALID_LOGIN_METHOD_ID)
    }

    public async readLoginMethodById(id: string | undefined, queryRunner: QueryRunner) {
        this.validateLoginMethodId(id)
        return await queryRunner.manager.findOneBy(LoginMethod, { id })
    }

    public validateLoginMethodName(name: string | undefined) {
        if (isInvalidName(name)) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, LoginMethodErrorMessage.INVALID_LOGIN_METHOD_NAME)
    }

    public validateLoginMethodStatus(status: string | undefined) {
        if (status && !Object.values(LoginMethodStatus).includes(status as LoginMethodStatus))
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, LoginMethodErrorMessage.INVALID_LOGIN_METHOD_STATUS)
    }

    public async readLoginMethodByOrganizationId(organizationId: string | undefined, queryRunner: QueryRunner) {
        if (organizationId) {
            const organization = await this.organizationService.readOrganizationById(organizationId, queryRunner)
            if (!organization) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationErrorMessage.ORGANIZATION_NOT_FOUND)
            return await queryRunner.manager.findBy(LoginMethod, { organizationId })
        } else {
            return await queryRunner.manager.findBy(LoginMethod, { organizationId: IsNull() })
        }
    }

    public async encryptLoginMethodConfig(config: string | undefined) {
        if (!config) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, LoginMethodErrorMessage.INVALID_LOGIN_METHOD_STATUS)
        return await encrypt(config)
    }

    public async decryptLoginMethodConfig(config: string | undefined) {
        if (!config) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, LoginMethodErrorMessage.INVALID_LOGIN_METHOD_STATUS)
        return await decrypt(config)
    }

    private async saveLoginMethod(data: Partial<LoginMethod>, queryRunner: QueryRunner) {
        return await queryRunner.manager.save(LoginMethod, data)
    }

    public async createLoginMethod(data: Partial<LoginMethod>) {
        let queryRunner: QueryRunner | undefined
        let newLoginMethod: Partial<LoginMethod>
        try {
            queryRunner = this.dataSource.createQueryRunner()
            await queryRunner.connect()
            const createdBy = await this.userService.readUserById(data.createdBy, queryRunner)
            if (!createdBy) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
            const organization = await this.organizationService.readOrganizationById(data.organizationId, queryRunner)
            if (!organization) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationErrorMessage.ORGANIZATION_NOT_FOUND)
            this.validateLoginMethodName(data.name)
            this.validateLoginMethodStatus(data.status)
            data.config = await this.encryptLoginMethodConfig(data.config)
            data.updatedBy = createdBy.id

            newLoginMethod = await queryRunner.manager.create(LoginMethod, data)
            await queryRunner.startTransaction()
            newLoginMethod = await this.saveLoginMethod(newLoginMethod, queryRunner)
            await queryRunner.commitTransaction()
        } catch (error) {
            if (queryRunner && !queryRunner.isTransactionActive) await queryRunner.rollbackTransaction()
            throw error
        } finally {
            if (queryRunner && !queryRunner.isReleased) await queryRunner.release()
        }

        return newLoginMethod
    }

    public async createOrUpdateConfig(body: any) {
        let organizationId: string = body.organizationId
        let providers: any[] = body.providers
        let userId: string = body.userId

        let queryRunner
        try {
            queryRunner = this.dataSource.createQueryRunner()
            await queryRunner.connect()
            await queryRunner.startTransaction()
            const createdOrUpdatedByUser = await this.userService.readUserById(userId, queryRunner)
            if (!createdOrUpdatedByUser) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
            const organization = await this.organizationService.readOrganizationById(organizationId, queryRunner)
            if (!organization) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationErrorMessage.ORGANIZATION_NOT_FOUND)

            for (let provider of providers) {
                this.validateLoginMethodName(provider.providerName)
                this.validateLoginMethodStatus(provider.status)

                const name = provider.providerName
                const loginMethod = await queryRunner.manager.findOneBy(LoginMethod, { organizationId, name })
                if (loginMethod) {
                    /* empty */
                    loginMethod.status = provider.status
                    loginMethod.config = await this.encryptLoginMethodConfig(JSON.stringify(provider.config))
                    loginMethod.updatedBy = userId
                    await this.saveLoginMethod(loginMethod, queryRunner)
                } else {
                    const encryptedConfig = await this.encryptLoginMethodConfig(JSON.stringify(provider.config))
                    let newLoginMethod = queryRunner.manager.create(LoginMethod, {
                        organizationId,
                        name,
                        status: provider.status,
                        config: encryptedConfig,
                        createdBy: userId,
                        updatedBy: userId
                    })
                    await this.saveLoginMethod(newLoginMethod, queryRunner)
                }
            }
            await queryRunner.commitTransaction()
        } catch (error) {
            if (queryRunner) await queryRunner.rollbackTransaction()
            throw error
        } finally {
            if (queryRunner) await queryRunner.release()
        }
        return { status: 'OK', organizationId: organizationId }
    }

    public async updateLoginMethod(newLoginMethod: Partial<LoginMethod>) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        const oldLoginMethod = await this.readLoginMethodById(newLoginMethod.id, queryRunner)
        if (!oldLoginMethod) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, LoginMethodErrorMessage.LOGIN_METHOD_NOT_FOUND)
        const updatedBy = await this.userService.readUserById(newLoginMethod.updatedBy, queryRunner)
        if (!updatedBy) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
        if (newLoginMethod.organizationId) {
            const organization = await this.organizationService.readOrganizationById(newLoginMethod.organizationId, queryRunner)
            if (!organization) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationErrorMessage.ORGANIZATION_NOT_FOUND)
        }
        if (newLoginMethod.name) this.validateLoginMethodName(newLoginMethod.name)
        if (newLoginMethod.config) newLoginMethod.config = await this.encryptLoginMethodConfig(newLoginMethod.config)
        if (newLoginMethod.status) this.validateLoginMethodStatus(newLoginMethod.status)
        newLoginMethod.createdBy = oldLoginMethod.createdBy

        let updateLoginMethod = queryRunner.manager.merge(LoginMethod, newLoginMethod)
        try {
            await queryRunner.startTransaction()
            updateLoginMethod = await this.saveLoginMethod(updateLoginMethod, queryRunner)
            await queryRunner.commitTransaction()
        } catch (error) {
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            await queryRunner.release()
        }

        return updateLoginMethod
    }
}
