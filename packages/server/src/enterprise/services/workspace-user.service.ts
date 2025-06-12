import { StatusCodes } from 'http-status-codes'
import { DataSource, QueryRunner } from 'typeorm'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { GeneralErrorMessage, GeneralSuccessMessage } from '../../utils/constants'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { OrganizationUser } from '../database/entities/organization-user.entity'
import { GeneralRole } from '../database/entities/role.entity'
import { WorkspaceUser, WorkspaceUserStatus } from '../database/entities/workspace-user.entity'
import { Workspace } from '../database/entities/workspace.entity'
import { isInvalidDateTime } from '../utils/validation.util'
import { OrganizationUserErrorMessage } from './organization-user.service'
import { OrganizationErrorMessage, OrganizationService } from './organization.service'
import { RoleErrorMessage, RoleService } from './role.service'
import { UserErrorMessage, UserService } from './user.service'
import { WorkspaceErrorMessage, WorkspaceService } from './workspace.service'

export const enum WorkspaceUserErrorMessage {
    INVALID_WORKSPACE_USER_SATUS = 'Invalid Workspace User Status',
    INVALID_WORKSPACE_USER_LASTLOGIN = 'Invalid Workspace User LastLogin',
    WORKSPACE_USER_ALREADY_EXISTS = 'Workspace User Already Exists',
    WORKSPACE_USER_NOT_FOUND = 'Workspace User Not Found'
}

export class WorkspaceUserService {
    private dataSource: DataSource
    private userService: UserService
    private workspaceService: WorkspaceService
    private roleService: RoleService
    private organizationService: OrganizationService

    constructor() {
        const appServer = getRunningExpressApp()
        this.dataSource = appServer.AppDataSource
        this.userService = new UserService()
        this.workspaceService = new WorkspaceService()
        this.roleService = new RoleService()
        this.organizationService = new OrganizationService()
    }

    public validateWorkspaceUserStatus(status: string | undefined) {
        if (status && !Object.values(WorkspaceUserStatus).includes(status as WorkspaceUserStatus))
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, WorkspaceUserErrorMessage.INVALID_WORKSPACE_USER_SATUS)
    }

    public validateWorkspaceUserLastLogin(lastLogin: string | undefined) {
        if (isInvalidDateTime(lastLogin))
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, WorkspaceUserErrorMessage.INVALID_WORKSPACE_USER_LASTLOGIN)
    }

    public async readWorkspaceUserByWorkspaceIdUserId(
        workspaceId: string | undefined,
        userId: string | undefined,
        queryRunner: QueryRunner
    ) {
        const workspace = await this.workspaceService.readWorkspaceById(workspaceId, queryRunner)
        if (!workspace) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, WorkspaceErrorMessage.WORKSPACE_NOT_FOUND)
        const user = await this.userService.readUserById(userId, queryRunner)
        if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
        const ownerRole = await this.roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)

        const workspaceUser = await queryRunner.manager
            .createQueryBuilder(WorkspaceUser, 'workspaceUser')
            .innerJoinAndSelect('workspaceUser.role', 'role')
            .where('workspaceUser.workspaceId = :workspaceId', { workspaceId })
            .andWhere('workspaceUser.userId = :userId', { userId })
            .getOne()

        return {
            workspace,
            workspaceUser: workspaceUser
                ? {
                      ...workspaceUser,
                      isOrgOwner: workspaceUser.roleId === ownerRole?.id
                  }
                : null
        }
    }

    public async readWorkspaceUserByWorkspaceId(workspaceId: string | undefined, queryRunner: QueryRunner) {
        const workspace = await this.workspaceService.readWorkspaceById(workspaceId, queryRunner)
        if (!workspace) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, WorkspaceErrorMessage.WORKSPACE_NOT_FOUND)
        const ownerRole = await this.roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)

        const workspaceUsers = await queryRunner.manager
            .createQueryBuilder(WorkspaceUser, 'workspaceUser')
            .innerJoinAndSelect('workspaceUser.role', 'role')
            .innerJoinAndSelect('workspaceUser.user', 'user')
            .where('workspaceUser.workspaceId = :workspaceId', { workspaceId })
            .getMany()

        return workspaceUsers.map((workspaceUser) => {
            delete workspaceUser.user.credential
            delete workspaceUser.user.tempToken
            delete workspaceUser.user.tokenExpiry
            return {
                ...workspaceUser,
                isOrgOwner: workspaceUser.roleId === ownerRole?.id
            }
        })
    }

    public async readWorkspaceUserByUserId(userId: string | undefined, queryRunner: QueryRunner) {
        const user = await this.userService.readUserById(userId, queryRunner)
        if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
        const ownerRole = await this.roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)

        const workspaceUsers = await queryRunner.manager
            .createQueryBuilder(WorkspaceUser, 'workspaceUser')
            .innerJoinAndSelect('workspaceUser.workspace', 'workspace')
            .innerJoinAndSelect('workspaceUser.role', 'role')
            .where('workspaceUser.userId = :userId', { userId })
            .getMany()

        return workspaceUsers.map((user) => ({
            ...user,
            isOrgOwner: user.roleId === ownerRole?.id
        }))
    }

    public async readWorkspaceUserByOrganizationIdUserId(
        organizationId: string | undefined,
        userId: string | undefined,
        queryRunner: QueryRunner
    ) {
        const user = await this.userService.readUserById(userId, queryRunner)
        if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
        const organization = await this.organizationService.readOrganizationById(organizationId, queryRunner)
        if (!organization) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationErrorMessage.ORGANIZATION_NOT_FOUND)
        const ownerRole = await this.roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)

        const workspaceUsers = await queryRunner.manager
            .createQueryBuilder(WorkspaceUser, 'workspaceUser')
            .innerJoinAndSelect('workspaceUser.workspace', 'workspace')
            .innerJoinAndSelect('workspaceUser.role', 'role')
            .where('workspace.organizationId = :organizationId', { organizationId })
            .andWhere('workspaceUser.userId = :userId', { userId })
            .getMany()

        return workspaceUsers.map((user) => ({
            ...user,
            isOrgOwner: user.roleId === ownerRole?.id
        }))
    }

    public async readWorkspaceUserByOrganizationId(organizationId: string | undefined, queryRunner: QueryRunner) {
        const organization = await this.organizationService.readOrganizationById(organizationId, queryRunner)
        if (!organization) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationErrorMessage.ORGANIZATION_NOT_FOUND)
        const ownerRole = await this.roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)

        const workspaceUsers = await queryRunner.manager
            .createQueryBuilder(WorkspaceUser, 'workspaceUser')
            .innerJoinAndSelect('workspaceUser.workspace', 'workspace')
            .innerJoinAndSelect('workspaceUser.user', 'user')
            .innerJoinAndSelect('workspaceUser.role', 'role')
            .where('workspace.organizationId = :organizationId', { organizationId })
            .getMany()

        return workspaceUsers.map((user) => ({
            ...user,
            isOrgOwner: user.roleId === ownerRole?.id
        }))
    }

    public async readWorkspaceUserByRoleId(roleId: string | undefined, queryRunner: QueryRunner) {
        const role = await this.roleService.readRoleById(roleId, queryRunner)
        if (!role) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, RoleErrorMessage.ROLE_NOT_FOUND)
        const ownerRole = await this.roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)

        const workspaceUsers = await queryRunner.manager
            .createQueryBuilder(WorkspaceUser, 'workspaceUser')
            .innerJoinAndSelect('workspaceUser.workspace', 'workspace')
            .innerJoinAndSelect('workspaceUser.user', 'user')
            .innerJoinAndSelect('workspaceUser.role', 'role')
            .where('workspaceUser.roleId = :roleId', { roleId })
            .getMany()

        return workspaceUsers.map((workspaceUser) => {
            delete workspaceUser.user.credential
            delete workspaceUser.user.tempToken
            delete workspaceUser.user.tokenExpiry
            return {
                ...workspaceUser,
                isOrgOwner: workspaceUser.roleId === ownerRole?.id
            }
        })
    }

    public async readWorkspaceUserByLastLogin(userId: string | undefined, queryRunner: QueryRunner) {
        const user = await this.userService.readUserById(userId, queryRunner)
        if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
        const ownerRole = await this.roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)

        let workspaceUser = await queryRunner.manager
            .createQueryBuilder(WorkspaceUser, 'workspaceUser')
            .innerJoinAndSelect('workspaceUser.workspace', 'workspace')
            .innerJoinAndSelect('workspaceUser.role', 'role')
            .where('workspaceUser.userId = :userId', { userId })
            .andWhere('workspaceUser.lastLogin IS NOT NULL')
            .orderBy('workspaceUser.lastLogin', 'DESC')
            .take(1)
            .getOne()

        if (!workspaceUser) return await this.readWorkspaceUserByUserId(userId, queryRunner)

        return {
            ...workspaceUser,
            isOrgOwner: workspaceUser.roleId === ownerRole?.id
        }
    }

    public createNewWorkspaceUser(data: Partial<WorkspaceUser>, queryRunner: QueryRunner) {
        if (data.status) this.validateWorkspaceUserStatus(data.status)
        data.updatedBy = data.createdBy

        return queryRunner.manager.create(WorkspaceUser, data)
    }

    public async saveWorkspaceUser(data: Partial<WorkspaceUser>, queryRunner: QueryRunner) {
        return await queryRunner.manager.save(WorkspaceUser, data)
    }

    public async createWorkspaceUser(data: Partial<WorkspaceUser>) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        const { workspace, workspaceUser } = await this.readWorkspaceUserByWorkspaceIdUserId(data.workspaceId, data.userId, queryRunner)
        if (workspaceUser) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, WorkspaceUserErrorMessage.WORKSPACE_USER_ALREADY_EXISTS)
        const role = await this.roleService.readRoleById(data.roleId, queryRunner)
        if (!role) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, RoleErrorMessage.ROLE_NOT_FOUND)
        const createdBy = await this.userService.readUserById(data.createdBy, queryRunner)
        if (!createdBy) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)

        let newWorkspaceUser = this.createNewWorkspaceUser(data, queryRunner)
        workspace.updatedBy = data.createdBy
        try {
            await queryRunner.startTransaction()
            newWorkspaceUser = await this.saveWorkspaceUser(newWorkspaceUser, queryRunner)
            await this.workspaceService.saveWorkspace(workspace, queryRunner)
            await this.roleService.saveRole(role, queryRunner)
            await queryRunner.commitTransaction()
        } catch (error) {
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            await queryRunner.release()
        }

        return newWorkspaceUser
    }

    public async createWorkspace(data: Partial<Workspace>) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        const organization = await this.organizationService.readOrganizationById(data.organizationId, queryRunner)
        if (!organization) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationErrorMessage.ORGANIZATION_NOT_FOUND)

        const user = await this.userService.readUserById(data.createdBy, queryRunner)
        if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)

        let organizationUser = await queryRunner.manager.findOneBy(OrganizationUser, { organizationId: organization.id, userId: user.id })
        if (!organizationUser)
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationUserErrorMessage.ORGANIZATION_USER_NOT_FOUND)
        organizationUser.updatedBy = user.id

        let newWorkspace = this.workspaceService.createNewWorkspace(data, queryRunner)

        const ownerRole = await this.roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)
        if (!ownerRole) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, RoleErrorMessage.ROLE_NOT_FOUND)

        const role = await this.roleService.readRoleById(organizationUser.roleId, queryRunner)
        if (!role) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, RoleErrorMessage.ROLE_NOT_FOUND)

        // Add org admin as workspace owner if the user creating the workspace is NOT the org admin
        const orgAdmin = await queryRunner.manager.findOneBy(OrganizationUser, {
            organizationId: organization.id,
            roleId: ownerRole.id
        })
        if (!orgAdmin) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationUserErrorMessage.ORGANIZATION_USER_NOT_FOUND)

        let isCreateWorkSpaceUserOrgAdmin = false
        if (orgAdmin.userId === user.id) {
            isCreateWorkSpaceUserOrgAdmin = true
        }

        let orgAdminUser: Partial<WorkspaceUser> = {
            workspaceId: newWorkspace.id,
            roleId: ownerRole.id,
            userId: orgAdmin.userId,
            createdBy: orgAdmin.userId
        }
        if (!isCreateWorkSpaceUserOrgAdmin) orgAdminUser = this.createNewWorkspaceUser(orgAdminUser, queryRunner)

        let newWorkspaceUser: Partial<WorkspaceUser> = {
            workspaceId: newWorkspace.id,
            roleId: role.id,
            userId: user.id,
            createdBy: user.id
        }
        // If user creating the workspace is an invited user, not the organization admin, inherit the role from existingWorkspaceId
        if ((data as any).existingWorkspaceId) {
            const existingWorkspaceUser = await queryRunner.manager.findOneBy(WorkspaceUser, {
                workspaceId: (data as any).existingWorkspaceId,
                userId: user.id
            })
            if (existingWorkspaceUser) {
                newWorkspaceUser.roleId = existingWorkspaceUser.roleId
            }
        }

        newWorkspaceUser = this.createNewWorkspaceUser(newWorkspaceUser, queryRunner)

        try {
            await queryRunner.startTransaction()
            newWorkspace = await this.workspaceService.saveWorkspace(newWorkspace, queryRunner)
            if (!isCreateWorkSpaceUserOrgAdmin) await this.saveWorkspaceUser(orgAdminUser, queryRunner)
            await this.saveWorkspaceUser(newWorkspaceUser, queryRunner)
            await queryRunner.manager.save(OrganizationUser, organizationUser)
            await queryRunner.commitTransaction()
        } catch (error) {
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            await queryRunner.release()
        }

        return newWorkspace
    }

    public async updateWorkspaceUser(newWorkspaserUser: Partial<WorkspaceUser>, queryRunner: QueryRunner) {
        const { workspaceUser } = await this.readWorkspaceUserByWorkspaceIdUserId(
            newWorkspaserUser.workspaceId,
            newWorkspaserUser.userId,
            queryRunner
        )
        if (!workspaceUser) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, WorkspaceUserErrorMessage.WORKSPACE_USER_NOT_FOUND)
        if (newWorkspaserUser.roleId && workspaceUser.role) {
            const role = await this.roleService.readRoleById(newWorkspaserUser.roleId, queryRunner)
            if (!role) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, RoleErrorMessage.ROLE_NOT_FOUND)
            // check if the role is from the same organization
            if (role.organizationId !== workspaceUser.role.organizationId) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, RoleErrorMessage.ROLE_NOT_FOUND)
            }
            // delete role, the new role will be created again, with the new roleId (newWorkspaserUser.roleId)
            if (workspaceUser.role) delete workspaceUser.role
        }
        const updatedBy = await this.userService.readUserById(newWorkspaserUser.updatedBy, queryRunner)
        if (!updatedBy) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
        if (newWorkspaserUser.status) this.validateWorkspaceUserStatus(newWorkspaserUser.status)
        if (newWorkspaserUser.lastLogin) this.validateWorkspaceUserLastLogin(newWorkspaserUser.lastLogin)
        newWorkspaserUser.createdBy = workspaceUser.createdBy

        let updataWorkspaceUser = queryRunner.manager.merge(WorkspaceUser, workspaceUser, newWorkspaserUser)
        updataWorkspaceUser = await this.saveWorkspaceUser(updataWorkspaceUser, queryRunner)

        return updataWorkspaceUser
    }

    public async deleteWorkspaceUser(workspaceId: string | undefined, userId: string | undefined) {
        const queryRunner = this.dataSource.createQueryRunner()
        try {
            await queryRunner.connect()
            const { workspace, workspaceUser } = await this.readWorkspaceUserByWorkspaceIdUserId(workspaceId, userId, queryRunner)
            if (!workspaceUser) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, WorkspaceUserErrorMessage.WORKSPACE_USER_NOT_FOUND)
            const role = await this.roleService.readRoleById(workspaceUser.roleId, queryRunner)
            if (!role) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, RoleErrorMessage.ROLE_NOT_FOUND)
            if (role.name === GeneralRole.OWNER)
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, GeneralErrorMessage.NOT_ALLOWED_TO_DELETE_OWNER)

            await queryRunner.startTransaction()

            await queryRunner.manager.delete(WorkspaceUser, { workspaceId, userId })
            await this.roleService.saveRole(role, queryRunner)
            await this.workspaceService.saveWorkspace(workspace, queryRunner)

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
