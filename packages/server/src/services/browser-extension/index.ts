import { StatusCodes } from 'http-status-codes'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { IUser } from '../../Interface'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import checkOwnership from '../../utils/checkOwnership'

// Browser Extension visibility constant
const BROWSER_EXTENSION = 'Browser Extension'

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
            .where('chatflow.visibility LIKE :visibility', { visibility: `%${BROWSER_EXTENSION}%` })

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

/**
 * Update Browser Extension visibility for a specific chatflow
 * @param chatflowId - The ID of the chatflow to update
 * @param enabled - Whether to enable or disable Browser Extension visibility
 * @param user - The authenticated user object
 * @returns The updated chatflow object
 */
const updateBrowserExtensionVisibility = async (chatflowId: string, enabled: boolean, user: IUser): Promise<ChatFlow> => {
    try {
        const appServer = getRunningExpressApp()
        const chatFlowRepository = appServer.AppDataSource.getRepository(ChatFlow)

        // Find the chatflow
        const chatflow = await chatFlowRepository.findOneBy({ id: chatflowId })

        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow with ID ${chatflowId} not found`)
        }

        // Check if user has permission to modify this chatflow
        if (!(await checkOwnership(chatflow, user))) {
            throw new InternalFlowiseError(StatusCodes.FORBIDDEN, 'You do not have permission to update this chatflow')
        }

        // Ensure visibility is an array
        const visibilityArray = Array.isArray(chatflow.visibility)
            ? [...chatflow.visibility]
            : chatflow.visibility
            ? [chatflow.visibility]
            : []

        // Add or remove "Browser Extension" from visibility
        if (enabled && !visibilityArray.includes(BROWSER_EXTENSION as any)) {
            visibilityArray.push(BROWSER_EXTENSION as any)
        } else if (!enabled) {
            // Filter out Browser Extension if it exists
            const index = visibilityArray.findIndex((v) => String(v) === BROWSER_EXTENSION)
            if (index >= 0) {
                visibilityArray.splice(index, 1)
            }
        }

        // Update the chatflow
        chatflow.visibility = visibilityArray
        const updatedChatflow = await chatFlowRepository.save(chatflow)

        return updatedChatflow
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: browserExtensionService.updateBrowserExtensionVisibility - ${getErrorMessage(error)}`
        )
    }
}

export default {
    getBrowserExtensionChatflows,
    updateBrowserExtensionVisibility
}
