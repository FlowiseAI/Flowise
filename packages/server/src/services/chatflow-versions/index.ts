import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { ChatFlowMaster } from '../../database/entities/ChatFlowMaster'
import { ChatFlowVersion } from '../../database/entities/ChatFlowVersion'

/**
 * Get all versions for a chatflow master
 */
const getAllVersions = async (masterId: string, workspaceId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()

        // Verify master exists and belongs to workspace
        const master = await appServer.AppDataSource.getRepository(ChatFlowMaster).findOne({
            where: { id: masterId, workspaceId }
        })

        if (!master) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `ChatFlow master ${masterId} not found`)
        }

        // Get all versions for this master
        const versions = await appServer.AppDataSource.getRepository(ChatFlowVersion)
            .createQueryBuilder('version')
            .where('version.masterId = :masterId', { masterId })
            .orderBy('version.version', 'DESC')
            .getMany()

        return {
            masterId,
            name: master.name,
            activeVersion: versions.find((v) => v.isActive)?.version || null,
            versions: versions.map((v) => ({
                id: v.id,
                version: v.version,
                isActive: v.isActive,
                sourceVersion: v.sourceVersion,
                changeDescription: v.changeDescription,
                createdBy: v.createdBy,
                createdDate: v.createdDate,
                updatedDate: v.updatedDate
            }))
        }
    } catch (error) {
        if (error instanceof InternalFlowiseError) {
            throw error
        }
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowVersionsService.getAllVersions - ${getErrorMessage(error)}`
        )
    }
}

/**
 * Get a specific version
 */
const getVersion = async (masterId: string, versionNumber: number, workspaceId: string): Promise<ChatFlowVersion> => {
    try {
        const appServer = getRunningExpressApp()

        // Verify master exists and belongs to workspace
        const master = await appServer.AppDataSource.getRepository(ChatFlowMaster).findOne({
            where: { id: masterId, workspaceId }
        })

        if (!master) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `ChatFlow master ${masterId} not found`)
        }

        const version = await appServer.AppDataSource.getRepository(ChatFlowVersion).findOne({
            where: { masterId, version: versionNumber }
        })

        if (!version) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Version ${versionNumber} not found for chatflow ${masterId}`)
        }

        return version
    } catch (error) {
        if (error instanceof InternalFlowiseError) {
            throw error
        }
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowVersionsService.getVersion - ${getErrorMessage(error)}`
        )
    }
}

/**
 * Get the active version for a chatflow
 */
const getActiveVersion = async (masterId: string, workspaceId: string): Promise<ChatFlowVersion> => {
    try {
        const appServer = getRunningExpressApp()

        // Verify master exists and belongs to workspace
        const master = await appServer.AppDataSource.getRepository(ChatFlowMaster).findOne({
            where: { id: masterId, workspaceId }
        })

        if (!master) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `ChatFlow master ${masterId} not found`)
        }

        const activeVersion = await appServer.AppDataSource.getRepository(ChatFlowVersion).findOne({
            where: { masterId, isActive: true }
        })

        if (!activeVersion) {
            // Fallback to latest version if no active version is set
            const latestVersion = await appServer.AppDataSource.getRepository(ChatFlowVersion)
                .createQueryBuilder('version')
                .where('version.masterId = :masterId', { masterId })
                .orderBy('version.createdDate', 'DESC')
                .getOne()

            if (!latestVersion) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `No versions found for chatflow ${masterId}`)
            }

            return latestVersion
        }

        return activeVersion
    } catch (error) {
        if (error instanceof InternalFlowiseError) {
            throw error
        }
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowVersionsService.getActiveVersion - ${getErrorMessage(error)}`
        )
    }
}

/**
 * Create a new version
 */
const createVersion = async (masterId: string, workspaceId: string, versionData: Partial<ChatFlowVersion>): Promise<ChatFlowVersion> => {
    try {
        const appServer = getRunningExpressApp()

        // Verify master exists and belongs to workspace
        const master = await appServer.AppDataSource.getRepository(ChatFlowMaster).findOne({
            where: { id: masterId, workspaceId }
        })

        if (!master) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `ChatFlow master ${masterId} not found`)
        }

        // Get the highest version number
        const maxVersion = await appServer.AppDataSource.getRepository(ChatFlowVersion)
            .createQueryBuilder('version')
            .select('MAX(version.version)', 'maxVersion')
            .where('version.masterId = :masterId', { masterId })
            .getRawOne()

        const newVersionNumber = (maxVersion?.maxVersion || 0) + 1

        // Create new version
        const newVersion = new ChatFlowVersion()
        newVersion.masterId = masterId
        newVersion.version = newVersionNumber
        newVersion.flowData = versionData.flowData || ''
        newVersion.apikeyid = versionData.apikeyid
        newVersion.chatbotConfig = versionData.chatbotConfig
        newVersion.apiConfig = versionData.apiConfig
        newVersion.analytic = versionData.analytic
        newVersion.speechToText = versionData.speechToText
        newVersion.textToSpeech = versionData.textToSpeech
        newVersion.followUpPrompts = versionData.followUpPrompts
        newVersion.changeDescription = versionData.changeDescription
        newVersion.sourceVersion = versionData.sourceVersion
        newVersion.createdBy = versionData.createdBy
        newVersion.isActive = versionData.isActive !== undefined ? versionData.isActive : true

        // Use transaction to ensure atomicity when setting active version
        const savedVersion = await appServer.AppDataSource.transaction(async (transactionalEntityManager) => {
            // If setting as active, deactivate current active version
            if (newVersion.isActive) {
                await transactionalEntityManager.getRepository(ChatFlowVersion).update({ masterId, isActive: true }, { isActive: false })
            }
            const saved = await transactionalEntityManager.getRepository(ChatFlowVersion).save(newVersion)
            // Update master updatedDate
            await transactionalEntityManager.getRepository(ChatFlowMaster).update({ id: masterId }, { updatedDate: new Date() })
            return saved
        })

        return savedVersion
    } catch (error) {
        if (error instanceof InternalFlowiseError) {
            throw error
        }
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowVersionsService.createVersion - ${getErrorMessage(error)}`
        )
    }
}

/**
 * Update a version
 */
const updateVersion = async (
    masterId: string,
    versionNumber: number,
    workspaceId: string,
    updateData: Partial<ChatFlowVersion>
): Promise<ChatFlowVersion> => {
    try {
        const appServer = getRunningExpressApp()

        // Get version
        const version = await getVersion(masterId, versionNumber, workspaceId)

        // Update fields
        if (updateData.flowData !== undefined) version.flowData = updateData.flowData
        if (updateData.apikeyid !== undefined) version.apikeyid = updateData.apikeyid
        if (updateData.chatbotConfig !== undefined) version.chatbotConfig = updateData.chatbotConfig
        if (updateData.apiConfig !== undefined) version.apiConfig = updateData.apiConfig
        if (updateData.analytic !== undefined) version.analytic = updateData.analytic
        if (updateData.speechToText !== undefined) version.speechToText = updateData.speechToText
        if (updateData.textToSpeech !== undefined) version.textToSpeech = updateData.textToSpeech
        if (updateData.followUpPrompts !== undefined) version.followUpPrompts = updateData.followUpPrompts
        if (updateData.changeDescription !== undefined) version.changeDescription = updateData.changeDescription

        const updatedVersion = await appServer.AppDataSource.getRepository(ChatFlowVersion).save(version)

        // Update master updatedDate
        await appServer.AppDataSource.getRepository(ChatFlowMaster).update({ id: masterId }, { updatedDate: new Date() })

        return updatedVersion
    } catch (error) {
        if (error instanceof InternalFlowiseError) {
            throw error
        }
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowVersionsService.updateVersion - ${getErrorMessage(error)}`
        )
    }
}

/**
 * Set active version
 */
const setActiveVersion = async (masterId: string, versionNumber: number, workspaceId: string): Promise<void> => {
    try {
        const appServer = getRunningExpressApp()

        // Verify version exists
        await getVersion(masterId, versionNumber, workspaceId)

        // Atomic operation: deactivate all, activate target
        await appServer.AppDataSource.transaction(async (transactionalEntityManager) => {
            await transactionalEntityManager.getRepository(ChatFlowVersion).update({ masterId, isActive: true }, { isActive: false })

            await transactionalEntityManager.getRepository(ChatFlowVersion).update({ masterId, version: versionNumber }, { isActive: true })
        })

        // Update master updatedDate
        await appServer.AppDataSource.getRepository(ChatFlowMaster).update({ id: masterId }, { updatedDate: new Date() })
    } catch (error) {
        if (error instanceof InternalFlowiseError) {
            throw error
        }
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowVersionsService.setActiveVersion - ${getErrorMessage(error)}`
        )
    }
}

/**
 * Delete a version
 */
const deleteVersion = async (masterId: string, versionNumber: number, workspaceId: string): Promise<void> => {
    try {
        const appServer = getRunningExpressApp()

        // Get version
        const version = await getVersion(masterId, versionNumber, workspaceId)

        // Check if it's the active version
        if (version.isActive) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Cannot delete active version. Set another version as active first.')
        }

        // Check if it's the last version
        const versionCount = await appServer.AppDataSource.getRepository(ChatFlowVersion).count({ where: { masterId } })

        if (versionCount <= 1) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Cannot delete the last remaining version.')
        }

        await appServer.AppDataSource.getRepository(ChatFlowVersion).delete({ id: version.id })

        // Update master updatedDate
        await appServer.AppDataSource.getRepository(ChatFlowMaster).update({ id: masterId }, { updatedDate: new Date() })
    } catch (error) {
        if (error instanceof InternalFlowiseError) {
            throw error
        }
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowVersionsService.deleteVersion - ${getErrorMessage(error)}`
        )
    }
}

export default {
    getAllVersions,
    getVersion,
    getActiveVersion,
    createVersion,
    updateVersion,
    setActiveVersion,
    deleteVersion
}
