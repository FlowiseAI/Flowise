import { StatusCodes } from 'http-status-codes'
import { DataSource, Not, QueryRunner } from 'typeorm'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { GeneralErrorMessage } from '../../utils/constants'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { OrganizationUser, OrganizationUserStatus } from '../database/entities/organization-user.entity'
import { Organization } from '../database/entities/organization.entity'
import { GeneralRole } from '../database/entities/role.entity'
import { WorkspaceUser } from '../database/entities/workspace-user.entity'
import { Workspace } from '../database/entities/workspace.entity'
import { OrganizationErrorMessage, OrganizationService } from './organization.service'
import { RoleErrorMessage, RoleService } from './role.service'
import { UserErrorMessage, UserService } from './user.service'
import { WorkspaceUserErrorMessage } from './workspace-user.service'

export const enum OrganizationUserErrorMessage {
    INVALID_ORGANIZATION_USER_SATUS = 'Invalid Organization User Status',
    ORGANIZATION_USER_ALREADY_EXISTS = 'Organization User Already Exists',
    ORGANIZATION_USER_NOT_FOUND = 'Organization User Not Found'
}

export class OrganizationUserService {
    private dataSource: DataSource
    private userService: UserService
    private organizationService: OrganizationService
    private roleService: RoleService

    constructor() {
        const appServer = getRunningExpressApp()
        this.dataSource = appServer.AppDataSource
        this.userService = new UserService()
        this.organizationService = new OrganizationService()
        this.roleService = new RoleService()
    }

    public validateOrganizationUserStatus(status: string | undefined) {
        if (status && !Object.values(OrganizationUserStatus).includes(status as OrganizationUserStatus))
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, OrganizationUserErrorMessage.INVALID_ORGANIZATION_USER_SATUS)
    }

    public async readOrganizationUserByOrganizationIdUserId(
        organizationId: string | undefined,
        userId: string | undefined,
        queryRunner: QueryRunner
    ) {
        const organization = await this.organizationService.readOrganizationById(organizationId, queryRunner)
        if (!organization) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationErrorMessage.ORGANIZATION_NOT_FOUND)
        const user = await this.userService.readUserById(userId, queryRunner)
        if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
        const ownerRole = await this.roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)

        const organizationUser = await queryRunner.manager
            .createQueryBuilder(OrganizationUser, 'organizationUser')
            .innerJoinAndSelect('organizationUser.role', 'role')
            .where('organizationUser.organizationId = :organizationId', { organizationId })
            .andWhere('organizationUser.userId = :userId', { userId })
            .getOne()

        return {
            organization,
            organizationUser: organizationUser
                ? {
                      ...organizationUser,
                      isOrgOwner: organizationUser.roleId === ownerRole?.id
                  }
                : null
        }
    }

    public async readOrganizationUserByWorkspaceIdUserId(
        workspaceId: string | undefined,
        userId: string | undefined,
        queryRunner: QueryRunner
    ) {
        const workspace = await queryRunner.manager
            .createQueryBuilder(WorkspaceUser, 'workspaceUser')
            .innerJoinAndSelect('workspaceUser.workspace', 'workspace')
            .innerJoinAndSelect('workspaceUser.user', 'user')
            .innerJoinAndSelect('workspaceUser.role', 'role')
            .where('workspace.id = :workspaceId', { workspaceId })
            .getOne()
        if (!workspace) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, WorkspaceUserErrorMessage.WORKSPACE_USER_NOT_FOUND)
        return await this.readOrganizationUserByOrganizationIdUserId(workspace.workspace.organizationId, userId, queryRunner)
    }

    public async readOrganizationUserByOrganizationId(organizationId: string | undefined, queryRunner: QueryRunner) {
        const organization = await this.organizationService.readOrganizationById(organizationId, queryRunner)
        if (!organization) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationErrorMessage.ORGANIZATION_NOT_FOUND)
        const ownerRole = await this.roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)

        const organizationUsers = await queryRunner.manager
            .createQueryBuilder(OrganizationUser, 'organizationUser')
            .innerJoinAndSelect('organizationUser.user', 'user')
            .innerJoinAndSelect('organizationUser.role', 'role')
            .where('organizationUser.organizationId = :organizationId', { organizationId })
            .getMany()

        // Get workspace user last login for all users
        const workspaceUsers = await queryRunner.manager
            .createQueryBuilder(WorkspaceUser, 'workspaceUser')
            .where('workspaceUser.userId IN (:...userIds)', {
                userIds: organizationUsers.map((user) => user.userId)
            })
            .orderBy('workspaceUser.lastLogin', 'ASC')
            .getMany()

        const lastLoginMap = new Map(workspaceUsers.map((wu) => [wu.userId, wu.lastLogin]))

        return await Promise.all(
            organizationUsers.map(async (organizationUser) => {
                const workspaceUser = await queryRunner.manager.findBy(WorkspaceUser, {
                    userId: organizationUser.userId,
                    workspace: { organizationId: organizationId }
                })
                delete organizationUser.user.credential
                delete organizationUser.user.tempToken
                delete organizationUser.user.tokenExpiry
                return {
                    ...organizationUser,
                    isOrgOwner: organizationUser.roleId === ownerRole?.id,
                    lastLogin: lastLoginMap.get(organizationUser.userId) || null,
                    roleCount: workspaceUser.length
                }
            })
        )
    }

    public async readOrganizationUserByOrganizationIdRoleId(
        organizationId: string | undefined,
        roleId: string | undefined,
        queryRunner: QueryRunner
    ) {
        const organization = await this.organizationService.readOrganizationById(organizationId, queryRunner)
        if (!organization) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationErrorMessage.ORGANIZATION_NOT_FOUND)
        const role = await this.roleService.readRoleById(roleId, queryRunner)
        if (!role) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, RoleErrorMessage.ROLE_NOT_FOUND)
        const ownerRole = await this.roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)

        const orgUsers = await queryRunner.manager
            .createQueryBuilder(OrganizationUser, 'organizationUser')
            .innerJoinAndSelect('organizationUser.role', 'role')
            .innerJoinAndSelect('organizationUser.user', 'user')
            .where('organizationUser.organizationId = :organizationId', { organizationId })
            .andWhere('organizationUser.roleId = :roleId', { roleId })
            .getMany()

        return orgUsers.map((organizationUser) => {
            delete organizationUser.user.credential
            delete organizationUser.user.tempToken
            delete organizationUser.user.tokenExpiry
            return {
                ...organizationUser,
                isOrgOwner: organizationUser.roleId === ownerRole?.id
            }
        })
    }

    public async readOrganizationUserByUserId(userId: string | undefined, queryRunner: QueryRunner) {
        const user = await this.userService.readUserById(userId, queryRunner)
        if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
        const ownerRole = await this.roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)

        const orgUsers = await queryRunner.manager
            .createQueryBuilder(OrganizationUser, 'organizationUser')
            .innerJoinAndSelect('organizationUser.role', 'role')
            .where('organizationUser.userId = :userId', { userId })
            .getMany()

        const organizationUsers = orgUsers.map((user) => ({
            ...user,
            isOrgOwner: user.roleId === ownerRole?.id
        }))

        // loop through organizationUsers, get the organizationId, find the organization user with the ownerRole.id, and get the user's details
        for (const user of organizationUsers) {
            const organizationOwner = await this.readOrganizationUserByOrganizationIdRoleId(user.organizationId, ownerRole?.id, queryRunner)
            if (organizationOwner.length === 1) {
                // get the user's name and email
                const userDetails = await this.userService.readUserById(organizationOwner[0].userId, queryRunner)
                if (userDetails) {
                    user.user = userDetails
                }
            }
        }

        return organizationUsers
    }

    public async readOrgUsersCountByOrgId(organizationId: string): Promise<number> {
        try {
            const appServer = getRunningExpressApp()
            const dbResponse = await appServer.AppDataSource.getRepository(OrganizationUser).countBy({
                organizationId
            })
            return dbResponse
        } catch (error) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, OrganizationUserErrorMessage.ORGANIZATION_USER_NOT_FOUND)
        }
    }

    public createNewOrganizationUser(data: Partial<OrganizationUser>, queryRunner: QueryRunner) {
        if (data.status) this.validateOrganizationUserStatus(data.status)
        data.updatedBy = data.createdBy

        return queryRunner.manager.create(OrganizationUser, data)
    }

    public async saveOrganizationUser(data: Partial<OrganizationUser>, queryRunner: QueryRunner) {
        return await queryRunner.manager.save(OrganizationUser, data)
    }

    public async createOrganizationUser(data: Partial<OrganizationUser>) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        const { organization, organizationUser } = await this.readOrganizationUserByOrganizationIdUserId(
            data.organizationId,
            data.userId,
            queryRunner
        )
        if (organizationUser)
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, OrganizationUserErrorMessage.ORGANIZATION_USER_ALREADY_EXISTS)
        const role = await this.roleService.readRoleIsGeneral(data.roleId, queryRunner)
        if (!role) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, RoleErrorMessage.ROLE_NOT_FOUND)
        const createdBy = await this.userService.readUserById(data.createdBy, queryRunner)
        if (!createdBy) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)

        let newOrganizationUser = this.createNewOrganizationUser(data, queryRunner)
        organization.updatedBy = data.createdBy
        try {
            await queryRunner.startTransaction()
            newOrganizationUser = await this.saveOrganizationUser(newOrganizationUser, queryRunner)
            await this.organizationService.saveOrganization(organization, queryRunner)
            await queryRunner.commitTransaction()
        } catch (error) {
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            await queryRunner.release()
        }

        return newOrganizationUser
    }

    public async createOrganization(data: Partial<Organization>) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        const user = await this.userService.readUserById(data.createdBy, queryRunner)
        if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)

        let newOrganization = this.organizationService.createNewOrganization(data, queryRunner)

        const role = await this.roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)
        if (!role) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, RoleErrorMessage.ROLE_NOT_FOUND)
        let newOrganizationUser: Partial<OrganizationUser> = {
            organizationId: newOrganization.id,
            userId: user.id,
            roleId: role.id,
            createdBy: user.id
        }
        newOrganizationUser = this.createNewOrganizationUser(newOrganizationUser, queryRunner)
        try {
            await queryRunner.startTransaction()
            newOrganization = await this.organizationService.saveOrganization(newOrganization, queryRunner)
            await this.saveOrganizationUser(newOrganizationUser, queryRunner)
            await queryRunner.commitTransaction()
        } catch (error) {
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            await queryRunner.release()
        }

        return newOrganization
    }

    public async updateOrganizationUser(newOrganizationUser: Partial<OrganizationUser>) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        const { organizationUser } = await this.readOrganizationUserByOrganizationIdUserId(
            newOrganizationUser.organizationId,
            newOrganizationUser.userId,
            queryRunner
        )
        if (!organizationUser)
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationUserErrorMessage.ORGANIZATION_USER_NOT_FOUND)

        if (newOrganizationUser.roleId) {
            const role = await this.roleService.readRoleIsGeneral(newOrganizationUser.roleId, queryRunner)
            if (!role) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, RoleErrorMessage.ROLE_NOT_FOUND)
        }

        if (newOrganizationUser.status) this.validateOrganizationUserStatus(newOrganizationUser.status)

        newOrganizationUser.createdBy = organizationUser.createdBy

        let updateOrganizationUser = queryRunner.manager.merge(OrganizationUser, organizationUser, newOrganizationUser)
        try {
            await queryRunner.startTransaction()
            updateOrganizationUser = await this.saveOrganizationUser(updateOrganizationUser, queryRunner)
            await queryRunner.commitTransaction()
        } catch (error) {
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            await queryRunner.release()
        }

        return updateOrganizationUser
    }

    public async deleteOrganizationUser(queryRunner: QueryRunner, organizationId: string | undefined, userId: string | undefined) {
        const { organizationUser } = await this.readOrganizationUserByOrganizationIdUserId(organizationId, userId, queryRunner)
        if (!organizationUser)
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationUserErrorMessage.ORGANIZATION_USER_NOT_FOUND)
        const role = await this.roleService.readRoleById(organizationUser.roleId, queryRunner)
        if (!role) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, RoleErrorMessage.ROLE_NOT_FOUND)
        if (role.name === GeneralRole.OWNER)
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, GeneralErrorMessage.NOT_ALLOWED_TO_DELETE_OWNER)

        const rolePersonalWorkspace = await this.roleService.readGeneralRoleByName(GeneralRole.PERSONAL_WORKSPACE, queryRunner)
        const organizationWorkspaces = await queryRunner.manager.findBy(Workspace, { organizationId })
        const workspaceUserToDelete = organizationWorkspaces.map((organizationWorkspace) => ({
            workspaceId: organizationWorkspace.id,
            userId: organizationUser.userId,
            roleId: Not(rolePersonalWorkspace.id)
        }))

        await queryRunner.manager.delete(OrganizationUser, { organizationId, userId })
        await queryRunner.manager.delete(WorkspaceUser, workspaceUserToDelete)

        return organizationUser
    }
}
