import { StatusCodes } from 'http-status-codes'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { IUser } from '../../Interface'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

/**
 * Get all chatflows that are available for the browser extension
 * @param user - The authenticated user object
 * @returns An array of chatflows available for the browser extension
 */
const getBrowserExtensionChatflows = async (user: IUser): Promise<ChatFlow[]> => {
    try {
        const appServer = getRunningExpressApp()
        const chatFlowRepository = appServer.AppDataSource.getRepository(ChatFlow)

        // Query chatflows that:
        // 1. Belong to the user or their organization
        // 2. Have 'Browser Extension' in their visibility settings
        const queryBuilder = chatFlowRepository
            .createQueryBuilder('chatflow')
            .where('chatflow.visibility LIKE :visibility', { visibility: '%Browser Extension%' })

        // If user is an org admin, show all org chatflows with Browser Extension visibility
        if (user.permissions?.includes('org:manage')) {
            queryBuilder.andWhere('chatflow.organizationId = :organizationId', { organizationId: user.organizationId })
        } else {
            // Otherwise only show user's own chatflows
            queryBuilder.andWhere('chatflow.userId = :userId', { userId: user.id })
        }

        // Return the complete chatflow objects with all fields
        const dbResponse = await queryBuilder.getMany()

        // Return the entire chatflow objects to match the behavior of the /chatflows endpoint
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: browserExtensionService.getBrowserExtensionChatflows - ${getErrorMessage(error)}`
        )
    }
}

export default {
    getBrowserExtensionChatflows
}
