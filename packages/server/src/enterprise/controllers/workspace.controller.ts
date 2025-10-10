import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { QueryRunner } from 'typeorm'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { GeneralErrorMessage } from '../../utils/constants'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { OrganizationUserStatus } from '../database/entities/organization-user.entity'
import { GeneralRole } from '../database/entities/role.entity'
import { WorkspaceUserStatus } from '../database/entities/workspace-user.entity'
import { Workspace } from '../database/entities/workspace.entity'
import { IAssignedWorkspace, LoggedInUser } from '../Interface.Enterprise'
import { OrganizationUserErrorMessage, OrganizationUserService } from '../services/organization-user.service'
import { OrganizationErrorMessage, OrganizationService } from '../services/organization.service'
import { RoleErrorMessage, RoleService } from '../services/role.service'
import { UserErrorMessage, UserService } from '../services/user.service'
import { WorkspaceUserErrorMessage, WorkspaceUserService } from '../services/workspace-user.service'
import { WorkspaceErrorMessage, WorkspaceService } from '../services/workspace.service'

export class WorkspaceController {
    public async create(req: Request, res: Response, next: NextFunction) {
        try {
            const workspaceUserService = new WorkspaceUserService()
            const newWorkspace = await workspaceUserService.createWorkspace(req.body)
            return res.status(StatusCodes.CREATED).json(newWorkspace)
        } catch (error) {
            next(error)
        }
    }

    public async read(req: Request, res: Response, next: NextFunction) {
        let queryRunner
        try {
            queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
            await queryRunner.connect()
            const query = req.query as Partial<Workspace>
            const workspaceService = new WorkspaceService()

            let workspace:
                | Workspace
                | null
                | (Workspace & {
                      userCount: number
                  })[]
            if (query.id) {
                workspace = await workspaceService.readWorkspaceById(query.id, queryRunner)
            } else if (query.organizationId) {
                workspace = await workspaceService.readWorkspaceByOrganizationId(query.organizationId, queryRunner)
            } else {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, GeneralErrorMessage.UNHANDLED_EDGE_CASE)
            }

            return res.status(StatusCodes.OK).json(workspace)
        } catch (error) {
            next(error)
        } finally {
            if (queryRunner) await queryRunner.release()
        }
    }

    public async switchWorkspace(req: Request, res: Response, next: NextFunction) {
        if (!req.user) {
            return next(new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized: User not found`))
        }
        let queryRunner
        try {
            queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
            await queryRunner.connect()
            const query = req.query as Partial<Workspace>
            await queryRunner.startTransaction()

            const workspaceService = new WorkspaceService()
            const workspace = await workspaceService.readWorkspaceById(query.id, queryRunner)
            if (!workspace) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, WorkspaceErrorMessage.WORKSPACE_NOT_FOUND)

            const userService = new UserService()
            const user = await userService.readUserById(req.user.id, queryRunner)
            if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)

            const workspaceUserService = new WorkspaceUserService()
            const { workspaceUser } = await workspaceUserService.readWorkspaceUserByWorkspaceIdUserId(query.id, req.user.id, queryRunner)
            if (!workspaceUser) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, WorkspaceUserErrorMessage.WORKSPACE_USER_NOT_FOUND)
            workspaceUser.lastLogin = new Date().toISOString()
            workspaceUser.status = WorkspaceUserStatus.ACTIVE
            workspaceUser.updatedBy = user.id
            await workspaceUserService.saveWorkspaceUser(workspaceUser, queryRunner)

            const organizationUserService = new OrganizationUserService()
            const { organizationUser } = await organizationUserService.readOrganizationUserByWorkspaceIdUserId(
                workspaceUser.workspaceId,
                workspaceUser.userId,
                queryRunner
            )
            if (!organizationUser)
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationUserErrorMessage.ORGANIZATION_USER_NOT_FOUND)
            organizationUser.status = OrganizationUserStatus.ACTIVE
            organizationUser.updatedBy = user.id
            await organizationUserService.saveOrganizationUser(organizationUser, queryRunner)

            const roleService = new RoleService()
            const ownerRole = await roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)
            const role = await roleService.readRoleById(workspaceUser.roleId, queryRunner)
            if (!role) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, RoleErrorMessage.ROLE_NOT_FOUND)

            const orgService = new OrganizationService()
            const org = await orgService.readOrganizationById(organizationUser.organizationId, queryRunner)
            if (!org) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationErrorMessage.ORGANIZATION_NOT_FOUND)
            const subscriptionId = org.subscriptionId as string
            const customerId = org.customerId as string
            const features = await getRunningExpressApp().identityManager.getFeaturesByPlan(subscriptionId)
            const productId = await getRunningExpressApp().identityManager.getProductIdFromSubscription(subscriptionId)

            const workspaceUsers = await workspaceUserService.readWorkspaceUserByUserId(req.user.id, queryRunner)
            const assignedWorkspaces: IAssignedWorkspace[] = workspaceUsers.map((workspaceUser) => {
                return {
                    id: workspaceUser.workspace.id,
                    name: workspaceUser.workspace.name,
                    role: workspaceUser.role?.name,
                    organizationId: workspaceUser.workspace.organizationId
                } as IAssignedWorkspace
            })

            const loggedInUser: LoggedInUser & { role: string; isSSO: boolean } = {
                ...req.user,
                activeOrganizationId: org.id,
                activeOrganizationSubscriptionId: subscriptionId,
                activeOrganizationCustomerId: customerId,
                activeOrganizationProductId: productId,
                isOrganizationAdmin: workspaceUser.roleId === ownerRole.id,
                activeWorkspaceId: workspace.id,
                activeWorkspace: workspace.name,
                assignedWorkspaces,
                isSSO: req.user.ssoProvider ? true : false,
                permissions: [...JSON.parse(role.permissions)],
                features,
                role: role.name,
                roleId: role.id
            }

            // update the passport session
            req.user = {
                ...req.user,
                ...loggedInUser
            }

            // Update passport session
            // @ts-ignore
            req.session.passport.user = {
                ...req.user,
                ...loggedInUser
            }

            req.session.save((err) => {
                if (err) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, GeneralErrorMessage.UNHANDLED_EDGE_CASE)
            })

            await queryRunner.commitTransaction()
            return res.status(StatusCodes.OK).json(loggedInUser)
        } catch (error) {
            if (queryRunner && !queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction()
            }
            next(error)
        } finally {
            if (queryRunner && !queryRunner.isReleased) {
                await queryRunner.release()
            }
        }
    }

    public async update(req: Request, res: Response, next: NextFunction) {
        try {
            const workspaceService = new WorkspaceService()
            const workspace = await workspaceService.updateWorkspace(req.body)
            return res.status(StatusCodes.OK).json(workspace)
        } catch (error) {
            next(error)
        }
    }

    public async delete(req: Request, res: Response, next: NextFunction) {
        let queryRunner: QueryRunner | undefined
        try {
            queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
            await queryRunner.connect()
            const workspaceId = req.params.id
            if (!workspaceId) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, WorkspaceErrorMessage.INVALID_WORKSPACE_ID)
            }
            const workspaceService = new WorkspaceService()
            await queryRunner.startTransaction()

            const workspace = await workspaceService.deleteWorkspaceById(queryRunner, workspaceId)

            await queryRunner.commitTransaction()
            return res.status(StatusCodes.OK).json(workspace)
        } catch (error) {
            if (queryRunner && queryRunner.isTransactionActive) await queryRunner.rollbackTransaction()
            next(error)
        } finally {
            if (queryRunner && !queryRunner.isReleased) await queryRunner.release()
        }
    }

    public async getSharedWorkspacesForItem(req: Request, res: Response, next: NextFunction) {
        try {
            if (typeof req.params === 'undefined' || !req.params.id) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, WorkspaceErrorMessage.INVALID_WORKSPACE_ID)
            }
            const workspaceService = new WorkspaceService()
            return res.json(await workspaceService.getSharedWorkspacesForItem(req.params.id))
        } catch (error) {
            next(error)
        }
    }

    public async setSharedWorkspacesForItem(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized: User not found`)
            }
            if (typeof req.params === 'undefined' || !req.params.id) {
                throw new InternalFlowiseError(
                    StatusCodes.UNAUTHORIZED,
                    `Error: workspaceController.setSharedWorkspacesForItem - id not provided!`
                )
            }
            if (!req.body) {
                throw new InternalFlowiseError(
                    StatusCodes.PRECONDITION_FAILED,
                    `Error: workspaceController.setSharedWorkspacesForItem - body not provided!`
                )
            }
            const workspaceService = new WorkspaceService()
            return res.json(await workspaceService.setSharedWorkspacesForItem(req.params.id, req.body))
        } catch (error) {
            next(error)
        }
    }
}
