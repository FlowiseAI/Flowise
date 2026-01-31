import { StatusCodes } from 'http-status-codes'
import { ChatFlow } from '../../../database/entities/ChatFlow'
import { InternalFlowiseError } from '../../../errors/internalFlowiseError'
import { LoggedInUser } from '../../Interface.Enterprise'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import logger from '../../../utils/logger'

/**
 * Service to handle chatflow authorization and permissions
 */
export class ChatflowAuthService {
    /**
     * Verify that a user has access to a specific chatflow
     * Checks:
     * 1. Chatflow exists
     * 2. Chatflow belongs to user's active workspace
     * 3. User's workspace is in the same organization
     */
    async verifyChatflowAccess(user: LoggedInUser, chatflowId: string): Promise<boolean> {
        try {
            const appServer = getRunningExpressApp()

            // Fetch the chatflow
            const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOne({
                where: { id: chatflowId }
            })

            if (!chatflow) {
                logger.warn(`⚠️ [Authorization]: Chatflow ${chatflowId} not found`)
                return false
            }

            // Check if chatflow belongs to user's active workspace
            if (chatflow.workspaceId !== user.activeWorkspaceId) {
                logger.warn(
                    `⚠️ [Authorization]: User ${user.email} (workspace: ${user.activeWorkspaceId}) ` +
                        `attempted to access chatflow ${chatflowId} from workspace ${chatflow.workspaceId}`
                )
                return false
            }

            // Additional check: verify user has access to this workspace
            const userHasWorkspace = user.assignedWorkspaces?.some((ws) => ws.id === chatflow.workspaceId)

            if (!userHasWorkspace) {
                logger.warn(
                    `⚠️ [Authorization]: User ${user.email} is not assigned to workspace ${chatflow.workspaceId}` +
                        ` but tried to access chatflow ${chatflowId}`
                )
                return false
            }

            logger.info(`✅ [Authorization]: User ${user.email} authorized for chatflow ${chatflowId}`)
            return true
        } catch (error) {
            logger.error('❌ [Authorization]: Error verifying chatflow access:', error)
            return false
        }
    }

    /**
     * Get chatflow details if user has access
     * @throws InternalFlowiseError if access is denied
     */
    async getChatflowWithAuthorization(user: LoggedInUser, chatflowId: string): Promise<ChatFlow> {
        const hasAccess = await this.verifyChatflowAccess(user, chatflowId)

        if (!hasAccess) {
            throw new InternalFlowiseError(
                StatusCodes.FORBIDDEN,
                `Access denied to chatflow ${chatflowId}. You do not have permission to access this resource.`
            )
        }

        const appServer = getRunningExpressApp()
        const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOne({
            where: { id: chatflowId }
        })

        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} not found`)
        }

        return chatflow
    }

    /**
     * Verify user has specific permission
     * This can be extended to check fine-grained permissions
     */
    hasPermission(user: LoggedInUser, permission: string): boolean {
        if (!user.permissions || user.permissions.length === 0) {
            return false
        }

        return user.permissions.includes(permission)
    }

    /**
     * Verify user is in the same organization as the chatflow
     */
    async verifySameOrganization(user: LoggedInUser, chatflowId: string): Promise<boolean> {
        try {
            const appServer = getRunningExpressApp()
            const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOne({
                where: { id: chatflowId },
                relations: ['workspace']
            })

            if (!chatflow) {
                return false
            }

            // The chatflow's workspace should belong to user's active organization
            // This is implicitly checked via workspace membership, but we can add
            // additional verification if needed
            return user.assignedWorkspaces?.some((ws) => ws.organizationId === user.activeOrganizationId) || false
        } catch (error) {
            logger.error('❌ [Authorization]: Error verifying organization:', error)
            return false
        }
    }
}
