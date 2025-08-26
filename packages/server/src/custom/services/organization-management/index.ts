import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../../errors/internalFlowiseError'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import { CustomOrganization } from '../../database/entities/CustomOrganization'
import { DataSource, QueryRunner } from 'typeorm'
import { generateId } from '../../../utils'

export const enum CustomOrganizationErrorMessage {
    INVALID_ORGANIZATION_ID = 'Invalid Organization Id',
    INVALID_ORGANIZATION_NAME = 'Invalid Organization Name',
    ORGANIZATION_NAME_ALREADY_EXISTS = 'Organization Name Already Exists',
    ORGANIZATION_NOT_FOUND = 'Organization Not Found',
    ORGANIZATION_CANNOT_DELETE_DEFAULT = 'Cannot Delete Default Organization'
}

export class CustomOrganizationService {
    private dataSource: DataSource

    constructor() {
        const appServer = getRunningExpressApp()
        this.dataSource = appServer.AppDataSource
    }

    public validateOrganizationId(id: string | undefined) {
        if (!id || typeof id !== 'string' || id.length === 0) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomOrganizationErrorMessage.INVALID_ORGANIZATION_ID)
        }
    }

    public async readOrganizationById(id: string | undefined, queryRunner: QueryRunner) {
        this.validateOrganizationId(id)
        return await queryRunner.manager.findOneBy(CustomOrganization, { id })
    }

    public validateOrganizationName(name: string | undefined) {
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomOrganizationErrorMessage.INVALID_ORGANIZATION_NAME)
        }
    }

    public async readOrganizationByName(name: string | undefined, queryRunner: QueryRunner) {
        this.validateOrganizationName(name)
        return await queryRunner.manager.findOneBy(CustomOrganization, { name })
    }

    public async getAllOrganizations(queryRunner: QueryRunner) {
        return await queryRunner.manager.find(CustomOrganization, {
            select: ['id', 'name', 'createdDate', 'updatedDate'],
            order: { createdDate: 'DESC' }
        })
    }

    public async createNewOrganization(data: Partial<CustomOrganization>, queryRunner: QueryRunner) {
        // Check if organization name already exists
        if (data.name) {
            const existingOrganization = await this.readOrganizationByName(data.name, queryRunner)
            if (existingOrganization) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomOrganizationErrorMessage.ORGANIZATION_NAME_ALREADY_EXISTS)
            }
        }

        this.validateOrganizationName(data.name)

        data.id = generateId()
        data.createdBy = data.createdBy || data.id
        data.updatedBy = data.updatedBy || data.id

        return queryRunner.manager.create(CustomOrganization, data)
    }

    public async saveOrganization(data: Partial<CustomOrganization>, queryRunner: QueryRunner) {
        return await queryRunner.manager.save(CustomOrganization, data)
    }

    public async createOrganization(data: Partial<CustomOrganization>) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        let newOrganization = await this.createNewOrganization(data, queryRunner)
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

    public async updateOrganization(organizationData: Partial<CustomOrganization>) {
        let queryRunner: QueryRunner | undefined
        let updatedOrganization: Partial<CustomOrganization>

        try {
            queryRunner = this.dataSource.createQueryRunner()
            await queryRunner.connect()

            const existingOrganization = await this.readOrganizationById(organizationData.id, queryRunner)
            if (!existingOrganization) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, CustomOrganizationErrorMessage.ORGANIZATION_NOT_FOUND)
            }

            if (organizationData.name && organizationData.name !== existingOrganization.name) {
                this.validateOrganizationName(organizationData.name)
                const existingNameOrganization = await this.readOrganizationByName(organizationData.name, queryRunner)
                if (existingNameOrganization && existingNameOrganization.id !== organizationData.id) {
                    throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomOrganizationErrorMessage.ORGANIZATION_NAME_ALREADY_EXISTS)
                }
            }

            organizationData.updatedBy = organizationData.updatedBy || existingOrganization.id

            updatedOrganization = queryRunner.manager.merge(CustomOrganization, existingOrganization, organizationData)

            await queryRunner.startTransaction()
            await this.saveOrganization(updatedOrganization, queryRunner)
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

        return updatedOrganization
    }

    public async deleteOrganization(id: string) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        try {
            const organization = await this.readOrganizationById(id, queryRunner)
            if (!organization) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, CustomOrganizationErrorMessage.ORGANIZATION_NOT_FOUND)
            }

            // Check if it's a default organization (you might want to prevent deletion)
            if (organization.name === 'Default Organization') {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, CustomOrganizationErrorMessage.ORGANIZATION_CANNOT_DELETE_DEFAULT)
            }

            await queryRunner.startTransaction()
            await queryRunner.manager.remove(CustomOrganization, organization)
            await queryRunner.commitTransaction()

            return { message: 'Organization deleted successfully' }
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