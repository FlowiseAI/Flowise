import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Role } from '../database/entities/role.entity'
import { RoleErrorMessage, RoleService } from '../services/role.service'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { GeneralErrorMessage } from '../../utils/constants'
import { assertQueryOrganizationMatchesActiveOrg, getLoggedInUser } from '../utils/tenantRequestGuards'

export class RoleController {
    public async create(req: Request, res: Response, next: NextFunction) {
        try {
            const user = getLoggedInUser(req)
            assertQueryOrganizationMatchesActiveOrg(user, req.body.organizationId)

            const roleService = new RoleService()
            const newRole = await roleService.createRole(req.body)
            return res.status(StatusCodes.CREATED).json(newRole)
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
            const query = req.query as Partial<Role>
            const roleService = new RoleService()

            let role: Role | Role[] | null | (Role & { userCount: number })[]
            if (query.id) {
                const oneRole = await roleService.readRoleById(query.id, queryRunner)
                if (!oneRole) {
                    throw new InternalFlowiseError(StatusCodes.NOT_FOUND, RoleErrorMessage.ROLE_NOT_FOUND)
                }
                if (oneRole.organizationId != null) {
                    if (!user.activeOrganizationId || oneRole.organizationId !== user.activeOrganizationId) {
                        throw new InternalFlowiseError(StatusCodes.FORBIDDEN, GeneralErrorMessage.FORBIDDEN)
                    }
                }
                role = oneRole
            } else if (query.organizationId) {
                if (!user.activeOrganizationId || query.organizationId !== user.activeOrganizationId) {
                    throw new InternalFlowiseError(StatusCodes.FORBIDDEN, GeneralErrorMessage.FORBIDDEN)
                }
                role = await roleService.readRoleByOrganizationId(query.organizationId, queryRunner)
            } else {
                role = await roleService.readRoleByGeneral(queryRunner)
            }

            return res.status(StatusCodes.OK).json(role)
        } catch (error) {
            next(error)
        } finally {
            if (queryRunner) await queryRunner.release()
        }
    }

    public async update(req: Request, res: Response, next: NextFunction) {
        try {
            const user = getLoggedInUser(req)
            assertQueryOrganizationMatchesActiveOrg(user, req.body.organizationId)

            const roleService = new RoleService()
            const role = await roleService.updateRole(req.body)
            return res.status(StatusCodes.OK).json(role)
        } catch (error) {
            next(error)
        }
    }

    public async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const query = req.query as Partial<Role>
            if (!query.id) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Role ID is required')
            }
            if (!query.organizationId) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Organization ID is required')
            }
            const roleService = new RoleService()
            const role = await roleService.deleteRole(query.organizationId, query.id)
            return res.status(StatusCodes.OK).json(role)
        } catch (error) {
            next(error)
        }
    }
}
