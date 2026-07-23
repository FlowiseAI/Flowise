import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../errors/internalFlowiseError'
import { WorkspaceUserService } from '../enterprise/services/workspace-user.service'
import chatflowsService from '../services/chatflows'
import { GeneralErrorMessage } from './constants'
import { getRunningExpressApp } from './getRunningExpressApp'

/**
 * Verifies that the caller has access to the specified chatflow.
 *
 * - Public chatflows: always allowed (unauthenticated embedded widget use case).
 * - Private chatflows: requires an authenticated user who belongs to the chatflow's workspace.
 *
 * @throws InternalFlowiseError(404) if the chatflow does not exist
 * @throws InternalFlowiseError(401) if the chatflow is private and no user is authenticated
 * @throws InternalFlowiseError(403) if the authenticated user is not in the chatflow's workspace
 */
export const verifyChatflowAccess = async (chatflowId: string, user: { id: string } | undefined): Promise<void> => {
    const chatflow = await chatflowsService.getChatflowById(chatflowId)
    if (chatflow.isPublic) return

    if (!user) {
        throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, GeneralErrorMessage.UNAUTHORIZED)
    }

    const appServer = getRunningExpressApp()
    const queryRunner = appServer.AppDataSource.createQueryRunner()
    try {
        const workspaceUserService = new WorkspaceUserService()
        const workspaceUser = await workspaceUserService.readWorkspaceUserByUserId(user.id, queryRunner)
        const workspaceIds = workspaceUser.map((u: any) => u.workspaceId)
        if (!workspaceIds.includes(chatflow.workspaceId)) {
            throw new InternalFlowiseError(StatusCodes.FORBIDDEN, GeneralErrorMessage.FORBIDDEN)
        }
    } finally {
        await queryRunner.release()
    }
}
