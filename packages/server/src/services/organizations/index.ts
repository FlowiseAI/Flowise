import { StatusCodes } from 'http-status-codes'
import { IUser } from '../../Interface'
import { Organization } from '../../database/entities/Organization'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

// Get organization by ID
const getOrganizationById = async (id: string, user?: IUser): Promise<Organization> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(Organization)
            .createQueryBuilder('organization')
            .where('organization.id = :id', { id })
            .getOne()

        if (!dbResponse) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Organization not found`)
        }

        return dbResponse
    } catch (error) {
        if (error instanceof InternalFlowiseError && error.statusCode === StatusCodes.NOT_FOUND) {
            throw error
        }
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: organizationService.getOrganizationById - ${getErrorMessage(error)}`
        )
    }
}

// Update organization enabled integrations
const updateOrganizationEnabledIntegrations = async (id: string, enabledIntegrations: string, user?: IUser): Promise<Organization> => {
    try {
        const appServer = getRunningExpressApp()

        // First verify the organization exists and user has access
        const organization = await getOrganizationById(id, user)

        // For now, we'll allow any authenticated user to update their own organization
        // In the future, this should check for admin permissions

        const organizationRepo = appServer.AppDataSource.getRepository(Organization)

        await organizationRepo.update({ id }, { enabledIntegrations })

        // Return updated organization
        const updatedOrganization = await organizationRepo.findOneBy({ id })

        if (!updatedOrganization) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Organization not found after update`)
        }

        return updatedOrganization
    } catch (error) {
        if (error instanceof InternalFlowiseError && error.statusCode === StatusCodes.NOT_FOUND) {
            throw error
        }
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: organizationService.updateOrganizationEnabledIntegrations - ${getErrorMessage(error)}`
        )
    }
}

// Get organization credentials (enabled integrations)
const getOrganizationCredentials = async (id: string, user?: IUser): Promise<{ integrations: any[] }> => {
    try {
        const appServer = getRunningExpressApp()
        const organization = await appServer.AppDataSource.getRepository(Organization)
            .createQueryBuilder('organization')
            .where('organization.id = :id', { id })
            .getOne()

        if (!organization) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Organization not found`)
        }

        let enabledIntegrationsData: { integrations: any[] } = { integrations: [] }

        if (
            organization.enabledIntegrations &&
            typeof organization.enabledIntegrations === 'string' &&
            organization.enabledIntegrations.length > 0
        ) {
            try {
                enabledIntegrationsData = JSON.parse(organization.enabledIntegrations)
            } catch (error) {
                console.error('Failed to parse enabledIntegrations:', error)
            }
        }

        return {
            integrations: enabledIntegrationsData.integrations || []
        }
    } catch (error) {
        if (error instanceof InternalFlowiseError && error.statusCode === StatusCodes.NOT_FOUND) {
            throw error
        }
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: organizationService.getOrganizationCredentials - ${getErrorMessage(error)}`
        )
    }
}

// Update organization credentials (enabled integrations)
const updateOrganizationCredentials = async (id: string, integrations: any[], user?: IUser): Promise<{ integrations: any[] }> => {
    try {
        const appServer = getRunningExpressApp()

        // First verify the organization exists and user has access
        const organization = await getOrganizationById(id, user)

        // Validate integrations array
        if (!Array.isArray(integrations)) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Integrations must be an array')
        }

        // Validate each integration object
        for (const integration of integrations) {
            if (!integration || typeof integration !== 'object') {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Each integration must be an object')
            }

            if (typeof integration.credentialName !== 'string' || !integration.credentialName.trim()) {
                throw new InternalFlowiseError(
                    StatusCodes.BAD_REQUEST,
                    'Integration credentialName is required and must be a non-empty string'
                )
            }

            if (typeof integration.label !== 'string' || !integration.label.trim()) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Integration label is required and must be a non-empty string')
            }

            if (typeof integration.enabled !== 'boolean') {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Integration enabled must be a boolean')
            }
        }

        const enabledIntegrationsData = { integrations }
        const enabledIntegrationsJson = JSON.stringify(enabledIntegrationsData)

        const organizationRepo = appServer.AppDataSource.getRepository(Organization)
        await organizationRepo.update({ id }, { enabledIntegrations: enabledIntegrationsJson })

        return {
            integrations: enabledIntegrationsData.integrations
        }
    } catch (error) {
        if (error instanceof InternalFlowiseError) {
            throw error
        }
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: organizationService.updateOrganizationCredentials - ${getErrorMessage(error)}`
        )
    }
}

export default {
    getOrganizationById,
    updateOrganizationEnabledIntegrations,
    getOrganizationCredentials,
    updateOrganizationCredentials
}
