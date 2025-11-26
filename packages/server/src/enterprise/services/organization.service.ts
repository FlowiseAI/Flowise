import { StatusCodes } from 'http-status-codes'
import { DataSource, QueryRunner } from 'typeorm'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { generateId } from '../../utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Telemetry } from '../../utils/telemetry'
import { Organization, OrganizationName } from '../database/entities/organization.entity'
import { isInvalidName, isInvalidUUID } from '../utils/validation.util'
import { UserErrorMessage, UserService } from './user.service'

export const enum OrganizationErrorMessage {
    INVALID_ORGANIZATION_ID = 'Invalid Organization Id',
    INVALID_ORGANIZATION_NAME = 'Invalid Organization Name',
    ORGANIZATION_NOT_FOUND = 'Organization Not Found',
    ORGANIZATION_FOUND_MULTIPLE = 'Organization Found Multiple',
    ORGANIZATION_RESERVERD_NAME = 'Organization name cannot be Default Organization - this is a reserved name'
}

export class OrganizationService {
    private telemetry: Telemetry
    private dataSource: DataSource
    private userService: UserService

    constructor() {
        const appServer = getRunningExpressApp()
        this.dataSource = appServer.AppDataSource
        this.telemetry = appServer.telemetry
        this.userService = new UserService()
    }

    public validateOrganizationId(id: string | undefined) {
        if (isInvalidUUID(id)) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, OrganizationErrorMessage.INVALID_ORGANIZATION_ID)
    }

    public async readOrganizationById(id: string | undefined, queryRunner: QueryRunner) {
        this.validateOrganizationId(id)
        return await queryRunner.manager.findOneBy(Organization, { id })
    }

    public validateOrganizationName(name: string | undefined, isRegister: boolean = false) {
        if (isInvalidName(name)) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, OrganizationErrorMessage.INVALID_ORGANIZATION_NAME)
        if (!isRegister && name === OrganizationName.DEFAULT_ORGANIZATION) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, OrganizationErrorMessage.ORGANIZATION_RESERVERD_NAME)
        }
    }

    public async readOrganizationByName(name: string | undefined, queryRunner: QueryRunner) {
        this.validateOrganizationName(name)
        return await queryRunner.manager.findOneBy(Organization, { name })
    }

    public async countOrganizations(queryRunner: QueryRunner) {
        return await queryRunner.manager.count(Organization)
    }

    public async readOrganization(queryRunner: QueryRunner) {
        return await queryRunner.manager.find(Organization)
    }

    public createNewOrganization(data: Partial<Organization>, queryRunner: QueryRunner, isRegister: boolean = false) {
        this.validateOrganizationName(data.name, isRegister)
        data.updatedBy = data.createdBy
        data.id = generateId()

        return queryRunner.manager.create(Organization, data)
    }

    public async saveOrganization(data: Partial<Organization>, queryRunner: QueryRunner) {
        return await queryRunner.manager.save(Organization, data)
    }

    public async createOrganization(data: Partial<Organization>) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        const user = await this.userService.readUserById(data.createdBy, queryRunner)
        if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)

        let newOrganization = this.createNewOrganization(data, queryRunner)
        try {
            await queryRunner.startTransaction()
            newOrganization = await this.saveOrganization(newOrganization, queryRunner)
            await queryRunner.commitTransaction()
        } catch (error) {
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            await queryRunner.release()
        }

        return newOrganization
    }

    public async updateOrganization(newOrganizationData: Partial<Organization>) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        const oldOrganizationData = await this.readOrganizationById(newOrganizationData.id, queryRunner)
        if (!oldOrganizationData) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationErrorMessage.ORGANIZATION_NOT_FOUND)
        const user = await this.userService.readUserById(newOrganizationData.updatedBy, queryRunner)
        if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
        if (newOrganizationData.name) {
            this.validateOrganizationName(newOrganizationData.name)
        }
        newOrganizationData.createdBy = oldOrganizationData.createdBy

        let updateOrganization = queryRunner.manager.merge(Organization, oldOrganizationData, newOrganizationData)
        try {
            await queryRunner.startTransaction()
            await this.saveOrganization(updateOrganization, queryRunner)
            await queryRunner.commitTransaction()
        } catch (error) {
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            await queryRunner.release()
        }

        return updateOrganization
    }
}
