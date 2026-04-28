import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { QueryRunner } from 'typeorm'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { GeneralErrorMessage } from '../../utils/constants'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { WorkspaceUser } from '../database/entities/workspace-user.entity'
import { WorkspaceUserService } from '../services/workspace-user.service'
import {
    assertQueryOrganizationMatchesActiveOrg,
    assertWorkspaceIdAccessibleToUser,
    getLoggedInUser,
    userMayManageOrgUsers
} from '../utils/tenantRequestGuards'

export class WorkspaceUserController {
    public async create(req: Request, res: Response, next: NextFunction) {
        try {
            const workspaceUserService = new WorkspaceUserService()
            const newWorkspaceUser = await workspaceUserService.createWorkspaceUser(req.body)
            return res.status(StatusCodes.CREATED).json(newWorkspaceUser)
        } catch (error) {
            next(error)
        }
    }

    public async read(req: Request, res: Response, next: NextFunction) {
        let queryRunner
        try {
            const user = getLoggedInUser(req)
            queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
            await queryRunner.connect()
            const query = req.query as Partial<WorkspaceUser & { organizationId: string | undefined }>
            const workspaceUserService = new WorkspaceUserService()

            let workspaceUser: any
            if (query.workspaceId && query.userId) {
                await assertWorkspaceIdAccessibleToUser(user, query.workspaceId, queryRunner)
                workspaceUser = await workspaceUserService.readWorkspaceUserByWorkspaceIdUserId(
                    query.workspaceId,
                    query.userId,
                    queryRunner
                )
            } else if (query.workspaceId) {
                await assertWorkspaceIdAccessibleToUser(user, query.workspaceId, queryRunner)
                workspaceUser = await workspaceUserService.readWorkspaceUserByWorkspaceId(query.workspaceId, queryRunner)
            } else if (query.organizationId && query.userId) {
                assertQueryOrganizationMatchesActiveOrg(user, query.organizationId)
                if (query.userId !== user.id && !userMayManageOrgUsers(user)) {
                    throw new InternalFlowiseError(StatusCodes.FORBIDDEN, GeneralErrorMessage.FORBIDDEN)
                }
                workspaceUser = await workspaceUserService.readWorkspaceUserByOrganizationIdUserId(
                    query.organizationId,
                    query.userId,
                    queryRunner
                )
            } else if (query.userId) {
                if (query.userId !== user.id && !userMayManageOrgUsers(user)) {
                    throw new InternalFlowiseError(StatusCodes.FORBIDDEN, GeneralErrorMessage.FORBIDDEN)
                }
                workspaceUser = await workspaceUserService.readWorkspaceUserByOrganizationIdUserId(
                    user.activeOrganizationId,
                    query.userId,
                    queryRunner
                )
            } else if (query.roleId) {
                if (!userMayManageOrgUsers(user)) {
                    throw new InternalFlowiseError(StatusCodes.FORBIDDEN, GeneralErrorMessage.FORBIDDEN)
                }
                workspaceUser = await workspaceUserService.readWorkspaceUserByRoleId(query.roleId, queryRunner, user.activeOrganizationId)
            } else {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, GeneralErrorMessage.UNHANDLED_EDGE_CASE)
            }

            return res.status(StatusCodes.OK).json(workspaceUser)
        } catch (error) {
            next(error)
        } finally {
            if (queryRunner) await queryRunner.release()
        }
    }

    public async update(req: Request, res: Response, next: NextFunction) {
        let queryRunner: QueryRunner | undefined
        try {
            queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
            await queryRunner.connect()
            const workspaceUserService = new WorkspaceUserService()
            const workspaceUser = await workspaceUserService.updateWorkspaceUser(req.body, queryRunner)
            return res.status(StatusCodes.OK).json(workspaceUser)
        } catch (error) {
            if (queryRunner && queryRunner.isTransactionActive) await queryRunner.rollbackTransaction()
            next(error)
        } finally {
            if (queryRunner && !queryRunner.isReleased) await queryRunner.release()
        }
    }

    public async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const query = req.query as Partial<WorkspaceUser>

            const workspaceUserService = new WorkspaceUserService()
            const workspaceUser = await workspaceUserService.deleteWorkspaceUser(query.workspaceId, query.userId)
            return res.status(StatusCodes.OK).json(workspaceUser)
        } catch (error) {
            next(error)
        }
    }
}
