import { StatusCodes } from 'http-status-codes'
import { DataSource, IsNull, QueryRunner } from 'typeorm'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { GeneralSuccessMessage } from '../../utils/constants'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Role } from '../database/entities/role.entity'
import { WorkspaceUser } from '../database/entities/workspace-user.entity'
import { isInvalidName, isInvalidUUID } from '../utils/validation.util'
import { OrganizationErrorMessage, OrganizationService } from './organization.service'
import { UserErrorMessage, UserService } from './user.service'

export const enum RoleErrorMessage {
    INVALID_ROLE_ID = 'Invalid Role Id',
    INVALID_ROLE_NAME = 'Invalid Role Name',
    INVALID_ROLE_PERMISSIONS = 'Invalid Role Permissions',
    ROLE_NOT_FOUND = 'Role Not Found'
}

export class RoleService {
    private dataSource: DataSource
    private userService: UserService
    private organizationService: OrganizationService

    constructor() {
        const appServer = getRunningExpressApp()
        this.dataSource = appServer.AppDataSource
        this.userService = new UserService()
        this.organizationService = new OrganizationService()
    }

    public validateRoleId(id: string | undefined) {
        if (isInvalidUUID(id)) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, RoleErrorMessage.INVALID_ROLE_ID)
    }

    public async readRoleById(id: string | undefined, queryRunner: QueryRunner) {
        this.validateRoleId(id)
        return await queryRunner.manager.findOneBy(Role, { id })
    }

    public validateRoleName(name: string | undefined) {
        if (isInvalidName(name)) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, RoleErrorMessage.INVALID_ROLE_NAME)
    }

    public async readRoleByOrganizationId(organizationId: string | undefined, queryRunner: QueryRunner) {
        const organization = await this.organizationService.readOrganizationById(organizationId, queryRunner)
        if (!organization) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationErrorMessage.ORGANIZATION_NOT_FOUND)

        const roles = await queryRunner.manager.findBy(Role, { organizationId })
        return await Promise.all(
            roles.map(async (role) => {
                const workspaceUser = await queryRunner.manager.findBy(WorkspaceUser, { roleId: role.id })
                const userCount = workspaceUser.length
                return { ...role, userCount } as Role & { userCount: number }
            })
        )
    }

    public async readRoleByRoleIdOrganizationId(id: string | undefined, organizationId: string | undefined, queryRunner: QueryRunner) {
        this.validateRoleId(id)
        const organization = await this.organizationService.readOrganizationById(organizationId, queryRunner)
        if (!organization) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationErrorMessage.ORGANIZATION_NOT_FOUND)

        return await queryRunner.manager.findOneBy(Role, { id, organizationId })
    }

    public async readGeneralRoleByName(name: string | undefined, queryRunner: QueryRunner) {
        this.validateRoleName(name)
        const generalRole = await queryRunner.manager.findOneBy(Role, { name, organizationId: IsNull() })
        if (!generalRole) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, RoleErrorMessage.ROLE_NOT_FOUND)
        return generalRole
    }

    public async readRoleIsGeneral(id: string | undefined, queryRunner: QueryRunner) {
        this.validateRoleId(id)
        return await queryRunner.manager.findOneBy(Role, { id, organizationId: IsNull() })
    }

    public async readRoleByGeneral(queryRunner: QueryRunner) {
        const generalRoles = await queryRunner.manager.find(Role, { where: { organizationId: IsNull() } })
        if (generalRoles.length <= 0) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, RoleErrorMessage.ROLE_NOT_FOUND)
        return generalRoles
    }

    public async readRole(queryRunner: QueryRunner) {
        return await queryRunner.manager.find(Role)
    }

    public async saveRole(data: Partial<Role>, queryRunner: QueryRunner) {
        return await queryRunner.manager.save(Role, data)
    }

    public async createRole(data: Partial<Role>) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        const user = await this.userService.readUserById(data.createdBy, queryRunner)
        if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
        const organization = await this.organizationService.readOrganizationById(data.organizationId, queryRunner)
        if (!organization) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationErrorMessage.ORGANIZATION_NOT_FOUND)
        this.validateRoleName(data.name)
        if (!data.permissions) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, RoleErrorMessage.INVALID_ROLE_PERMISSIONS)
        data.updatedBy = data.createdBy

        let newRole = queryRunner.manager.create(Role, data)
        try {
            await queryRunner.startTransaction()
            newRole = await this.saveRole(newRole, queryRunner)
            await queryRunner.commitTransaction()
        } catch (error) {
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            await queryRunner.release()
        }

        return newRole
    }

    public async updateRole(newRole: Partial<Role>) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        const oldRole = await this.readRoleById(newRole.id, queryRunner)
        if (!oldRole) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, RoleErrorMessage.ROLE_NOT_FOUND)
        const user = await this.userService.readUserById(newRole.updatedBy, queryRunner)
        if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
        if (newRole.name) this.validateRoleName(newRole.name)
        newRole.organizationId = oldRole.organizationId
        newRole.createdBy = oldRole.createdBy

        let updateRole = queryRunner.manager.merge(Role, oldRole, newRole)
        try {
            await queryRunner.startTransaction()
            updateRole = await this.saveRole(updateRole, queryRunner)
            await queryRunner.commitTransaction()
        } catch (error) {
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            await queryRunner.release()
        }

        return updateRole
    }

    public async deleteRole(organizationId: string | undefined, roleId: string | undefined) {
        const queryRunner = this.dataSource.createQueryRunner()
        try {
            await queryRunner.connect()

            const role = await this.readRoleByRoleIdOrganizationId(roleId, organizationId, queryRunner)
            if (!role) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, RoleErrorMessage.ROLE_NOT_FOUND)

            await queryRunner.startTransaction()

            await queryRunner.manager.delete(WorkspaceUser, { roleId })
            await queryRunner.manager.delete(Role, { id: roleId })

            await queryRunner.commitTransaction()

            return { message: GeneralSuccessMessage.DELETED }
        } catch (error) {
            if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction()
            throw error
        } finally {
            if (!queryRunner.isReleased) await queryRunner.release()
        }
    }
}
