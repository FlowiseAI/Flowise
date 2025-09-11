import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { GeneralErrorMessage } from '../../utils/constants'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { User } from '../database/entities/user.entity'
import { UserErrorMessage, UserService } from '../services/user.service'

export class UserController {
    public async create(req: Request, res: Response, next: NextFunction) {
        try {
            const userService = new UserService()
            const { createDirectly, user: userData, workspace, role } = req.body

            if (createDirectly && userData?.password) {
                // Direct user creation with password
                const newUser = await userService.createUserDirectly({
                    email: userData.email,
                    name: userData.name || userData.email,
                    credential: userData.password,
                    createdBy: userData.createdBy || req.user?.id
                })

                // Add to same organization and workspace as creator
                if (workspace?.id && role?.id && req.user?.activeOrganizationId) {
                    const queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
                    await queryRunner.connect()

                    try {
                        // Create organization user association using proper service methods
                        const { OrganizationUserService } = await import('../services/organization-user.service')
                        const { RoleService } = await import('../services/role.service')
                        const organizationUserService = new OrganizationUserService()
                        const roleService = new RoleService()

                        // Get the general "member" role instead of using organization-specific role
                        const memberRole = await roleService.readGeneralRoleByName('member', queryRunner)

                        const newOrgUser = organizationUserService.createNewOrganizationUser(
                            {
                                userId: newUser.id,
                                organizationId: req.user.activeOrganizationId,
                                roleId: memberRole.id,
                                createdBy: req.user?.id,
                                updatedBy: req.user?.id
                            },
                            queryRunner
                        )

                        await organizationUserService.saveOrganizationUser(newOrgUser, queryRunner)

                        // Create workspace user association
                        const { WorkspaceUserService } = await import('../services/workspace-user.service')
                        const workspaceUserService = new WorkspaceUserService()
                        await workspaceUserService.createWorkspaceUser({
                            userId: newUser.id,
                            workspaceId: workspace.id,
                            roleId: role.id,
                            createdBy: req.user?.id,
                            updatedBy: req.user?.id
                        })
                    } finally {
                        await queryRunner.release()
                    }
                }

                return res.status(StatusCodes.CREATED).json(newUser)
            } else {
                // Traditional invitation flow - pass the whole request body to existing logic
                const user = await userService.createUser(userData || req.body)
                return res.status(StatusCodes.CREATED).json(user)
            }
        } catch (error) {
            next(error)
        }
    }

    public async read(req: Request, res: Response, next: NextFunction) {
        let queryRunner
        try {
            queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
            await queryRunner.connect()
            const query = req.query as Partial<User>
            const userService = new UserService()

            let user: User | null
            if (query.id) {
                user = await userService.readUserById(query.id, queryRunner)
                if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
            } else if (query.email) {
                user = await userService.readUserByEmail(query.email, queryRunner)
                if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
            } else {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, GeneralErrorMessage.UNHANDLED_EDGE_CASE)
            }

            if (user) {
                delete user.credential
                delete user.tempToken
                delete user.tokenExpiry
            }
            return res.status(StatusCodes.OK).json(user)
        } catch (error) {
            next(error)
        } finally {
            if (queryRunner) await queryRunner.release()
        }
    }

    public async update(req: Request, res: Response, next: NextFunction) {
        try {
            const userService = new UserService()
            const currentUser = req.user
            if (!currentUser) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, UserErrorMessage.USER_NOT_FOUND)
            }
            const { id } = req.body
            if (currentUser.id !== id) {
                throw new InternalFlowiseError(StatusCodes.FORBIDDEN, UserErrorMessage.USER_NOT_FOUND)
            }
            const user = await userService.updateUser(req.body)
            return res.status(StatusCodes.OK).json(user)
        } catch (error) {
            next(error)
        }
    }

    public async test(req: Request, res: Response, next: NextFunction) {
        try {
            return res.status(StatusCodes.OK).json({ message: 'Hello World' })
        } catch (error) {
            next(error)
        }
    }
}
