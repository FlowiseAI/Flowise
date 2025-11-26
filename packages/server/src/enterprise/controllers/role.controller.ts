import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Role } from '../database/entities/role.entity'
import { RoleService } from '../services/role.service'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'

export class RoleController {
    public async create(req: Request, res: Response, next: NextFunction) {
        try {
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
            queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
            await queryRunner.connect()
            const query = req.query as Partial<Role>
            const roleService = new RoleService()

            let role: Role | Role[] | null | (Role & { userCount: number })[]
            if (query.id) {
                role = await roleService.readRoleById(query.id, queryRunner)
            } else if (query.organizationId) {
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
