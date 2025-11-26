import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { GeneralErrorMessage } from '../../utils/constants'
import { checkUsageLimit } from '../../utils/quotaUsage'
import { OrganizationUser } from '../database/entities/organization-user.entity'
import { Organization } from '../database/entities/organization.entity'

type OrganizationUserQuery = Partial<Pick<OrganizationUser, 'organizationId' | 'userId' | 'roleId'>>

import { QueryRunner } from 'typeorm'
import { Platform } from '../../Interface'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { GeneralRole } from '../database/entities/role.entity'
import { User, UserStatus } from '../database/entities/user.entity'
import { WorkspaceUser } from '../database/entities/workspace-user.entity'
import { OrganizationUserService } from '../services/organization-user.service'
import { RoleService } from '../services/role.service'
import { WorkspaceService } from '../services/workspace.service'

export class OrganizationUserController {
    public async create(req: Request, res: Response, next: NextFunction) {
        try {
            const organizationUserservice = new OrganizationUserService()
            const totalOrgUsers = await organizationUserservice.readOrgUsersCountByOrgId(req.body.organizationId)
            const subscriptionId = req.user?.activeOrganizationSubscriptionId || ''
            await checkUsageLimit('users', subscriptionId, getRunningExpressApp().usageCacheManager, totalOrgUsers + 1)
            const newOrganizationUser = await organizationUserservice.createOrganizationUser(req.body)
            return res.status(StatusCodes.CREATED).json(newOrganizationUser)
        } catch (error) {
            next(error)
        }
    }

    public async read(req: Request, res: Response, next: NextFunction) {
        let queryRunner
        try {
            queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
            await queryRunner.connect()
            const query = req.query as OrganizationUserQuery
            const organizationUserservice = new OrganizationUserService()

            let organizationUser:
                | {
                      organization: Organization
                      organizationUser: OrganizationUser | null
                  }
                | OrganizationUser
                | null
                | OrganizationUser[]
                | (OrganizationUser & {
                      roleCount: number
                  })[]
            if (query.organizationId && query.userId) {
                organizationUser = await organizationUserservice.readOrganizationUserByOrganizationIdUserId(
                    query.organizationId,
                    query.userId,
                    queryRunner
                )
            } else if (query.organizationId && query.roleId) {
                organizationUser = await organizationUserservice.readOrganizationUserByOrganizationIdRoleId(
                    query.organizationId,
                    query.roleId,
                    queryRunner
                )
            } else if (query.organizationId) {
                organizationUser = await organizationUserservice.readOrganizationUserByOrganizationId(query.organizationId, queryRunner)
            } else if (query.userId) {
                organizationUser = await organizationUserservice.readOrganizationUserByUserId(query.userId, queryRunner)
            } else {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, GeneralErrorMessage.UNHANDLED_EDGE_CASE)
            }

            return res.status(StatusCodes.OK).json(organizationUser)
        } catch (error) {
            next(error)
        } finally {
            if (queryRunner) await queryRunner.release()
        }
    }

    public async update(req: Request, res: Response, next: NextFunction) {
        try {
            const organizationUserService = new OrganizationUserService()
            const organizationUser = await organizationUserService.updateOrganizationUser(req.body)
            return res.status(StatusCodes.OK).json(organizationUser)
        } catch (error) {
            next(error)
        }
    }

    public async delete(req: Request, res: Response, next: NextFunction) {
        let queryRunner: QueryRunner | undefined
        try {
            queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
            const currentPlatform = getRunningExpressApp().identityManager.getPlatformType()
            await queryRunner.connect()
            const query = req.query as Partial<OrganizationUser>
            if (!query.organizationId) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Organization ID is required')
            }
            if (!query.userId) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'User ID is required')
            }

            const organizationUserService = new OrganizationUserService()
            const workspaceService = new WorkspaceService()
            const roleService = new RoleService()

            let organizationUser: OrganizationUser
            await queryRunner.startTransaction()
            if (currentPlatform === Platform.ENTERPRISE) {
                const personalRole = await roleService.readGeneralRoleByName(GeneralRole.PERSONAL_WORKSPACE, queryRunner)
                const personalWorkspaces = await queryRunner.manager.findBy(WorkspaceUser, {
                    userId: query.userId,
                    roleId: personalRole.id
                })
                if (personalWorkspaces.length === 1)
                    // delete personal workspace
                    await workspaceService.deleteWorkspaceById(queryRunner, personalWorkspaces[0].workspaceId)
                // remove user from other workspces
                organizationUser = await organizationUserService.deleteOrganizationUser(queryRunner, query.organizationId, query.userId)
                // soft delete user because they might workspace might created by them
                const deleteUser = await queryRunner.manager.findOneBy(User, { id: query.userId })
                if (!deleteUser) throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, GeneralErrorMessage.UNHANDLED_EDGE_CASE)
                deleteUser.name = UserStatus.DELETED
                deleteUser.email = `deleted_${deleteUser.id}_${Date.now()}@deleted.flowise`
                deleteUser.status = UserStatus.DELETED
                deleteUser.credential = null
                deleteUser.tokenExpiry = null
                deleteUser.tempToken = null
                await queryRunner.manager.save(User, deleteUser)
            } else {
                organizationUser = await organizationUserService.deleteOrganizationUser(queryRunner, query.organizationId, query.userId)
            }

            await queryRunner.commitTransaction()
            return res.status(StatusCodes.OK).json(organizationUser)
        } catch (error) {
            if (queryRunner && queryRunner.isTransactionActive) await queryRunner.rollbackTransaction()
            next(error)
        } finally {
            if (queryRunner && !queryRunner.isReleased) await queryRunner.release()
        }
    }
}
