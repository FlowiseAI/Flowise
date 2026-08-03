import { Request } from 'express'
import { StatusCodes } from 'http-status-codes'
import { QueryRunner } from 'typeorm'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { GeneralErrorMessage } from '../../utils/constants'
import { Workspace } from '../database/entities/workspace.entity'
import { LoggedInUser } from '../Interface.Enterprise'
import { OrganizationUserService } from '../services/organization-user.service'

export function getLoggedInUser(req: Request): LoggedInUser {
    const user = req.user as LoggedInUser | undefined
    if (!user?.id || !user?.activeOrganizationId || !user?.activeWorkspaceId) {
        throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, GeneralErrorMessage.UNAUTHORIZED)
    }
    return user
}

/**
 * Active workspace for tenant-scoped data access.
 * Interactive sessions use {@link getLoggedInUser} (requires `req.user.id`).
 * API key auth sets `activeWorkspaceId` / `activeOrganizationId` on `req.user` but not `id`.
 */
export function getActiveWorkspaceIdForRequest(req: Request): string {
    const user = req.user as Partial<LoggedInUser> | undefined
    if (user?.id) {
        return getLoggedInUser(req).activeWorkspaceId
    }
    if (!user?.activeWorkspaceId || !user?.activeOrganizationId) {
        throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, GeneralErrorMessage.UNAUTHORIZED)
    }
    return user.activeWorkspaceId
}

/** When a query supplies organizationId, it must match the caller's active organization. */
export function assertQueryOrganizationMatchesActiveOrg(user: LoggedInUser, organizationId: string | undefined): void {
    if (organizationId === undefined || organizationId === '') return
    if (organizationId !== user.activeOrganizationId) {
        throw new InternalFlowiseError(StatusCodes.FORBIDDEN, GeneralErrorMessage.FORBIDDEN)
    }
}

/**
 * Ensures the user may access data for this workspace: same as active workspace, listed in assigned workspaces,
 * or org admin for a workspace that belongs to their active organization.
 */
export async function assertWorkspaceIdAccessibleToUser(
    user: LoggedInUser,
    workspaceId: string | undefined,
    queryRunner: QueryRunner
): Promise<void> {
    if (workspaceId === undefined || workspaceId === '') return

    if (workspaceId === user.activeWorkspaceId) return

    if (user.assignedWorkspaces?.some((w) => w.id === workspaceId)) return

    if (user.isOrganizationAdmin) {
        const workspace = await queryRunner.manager.findOneBy(Workspace, { id: workspaceId })
        if (!workspace || workspace.organizationId !== user.activeOrganizationId) {
            throw new InternalFlowiseError(StatusCodes.FORBIDDEN, GeneralErrorMessage.FORBIDDEN)
        }
        return
    }

    throw new InternalFlowiseError(StatusCodes.FORBIDDEN, GeneralErrorMessage.FORBIDDEN)
}

export function assertStripeIdMatchesSession(requestedId: string, activeId: string | undefined): void {
    if (!activeId || requestedId !== activeId) {
        throw new InternalFlowiseError(StatusCodes.FORBIDDEN, GeneralErrorMessage.FORBIDDEN)
    }
}

export function userMayManageOrgUsers(user: LoggedInUser): boolean {
    return user.isOrganizationAdmin === true || (user.permissions?.includes('users:manage') ?? false)
}

/** Allows reading a user profile when it is self, or when the caller manages org users and the target belongs to the active org. */
export async function assertMayReadTargetUser(sessionUser: LoggedInUser, targetUserId: string, queryRunner: QueryRunner): Promise<void> {
    if (sessionUser.id && targetUserId === sessionUser.id) return
    if (!sessionUser.activeOrganizationId) {
        throw new InternalFlowiseError(StatusCodes.FORBIDDEN, GeneralErrorMessage.FORBIDDEN)
    }
    if (!userMayManageOrgUsers(sessionUser)) {
        throw new InternalFlowiseError(StatusCodes.FORBIDDEN, GeneralErrorMessage.FORBIDDEN)
    }
    const organizationUserService = new OrganizationUserService()
    const { organizationUser } = await organizationUserService.readOrganizationUserByOrganizationIdUserId(
        sessionUser.activeOrganizationId,
        targetUserId,
        queryRunner
    )
    if (!organizationUser) {
        throw new InternalFlowiseError(StatusCodes.FORBIDDEN, GeneralErrorMessage.FORBIDDEN)
    }
}
