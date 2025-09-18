// SSOBase.ts
import express from 'express'
import passport from 'passport'
import { IAssignedWorkspace, LoggedInUser } from '../Interface.Enterprise'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { UserErrorMessage, UserService } from '../services/user.service'
import { WorkspaceUserService } from '../services/workspace-user.service'
import { AccountService } from '../services/account.service'
import { WorkspaceUser } from '../database/entities/workspace-user.entity'
import { OrganizationService } from '../services/organization.service'
import { GeneralRole } from '../database/entities/role.entity'
import { RoleErrorMessage, RoleService } from '../services/role.service'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { Platform } from '../../Interface'
import { UserStatus } from '../database/entities/user.entity'

abstract class SSOBase {
    protected app: express.Application
    protected ssoConfig: any

    constructor(app: express.Application, ssoConfig?: any) {
        this.app = app
        this.ssoConfig = ssoConfig
    }

    setSSOConfig(ssoConfig: any) {
        this.ssoConfig = ssoConfig
    }

    getSSOConfig() {
        return this.ssoConfig
    }

    abstract getProviderName(): string
    abstract initialize(): void
    abstract refreshToken(ssoRefreshToken: string): Promise<{ [key: string]: any }>
    async verifyAndLogin(
        app: express.Application,
        email: string,
        done: (err?: Error | null, user?: Express.User, info?: any) => void,
        profile: passport.Profile,
        accessToken: string | object,
        refreshToken: string
    ) {
        let queryRunner
        const ssoProviderName = this.getProviderName()
        try {
            queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
            await queryRunner.connect()

            const userService = new UserService()
            const organizationService = new OrganizationService()
            const workspaceUserService = new WorkspaceUserService()

            let user: any = await userService.readUserByEmail(email, queryRunner)
            let wu: any = {}

            if (!user) {
                // In ENTERPRISE mode, we don't want to create a new user if the user is not found
                if (getRunningExpressApp().identityManager.getPlatformType() === Platform.ENTERPRISE) {
                    throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
                }
                // no user found, register the user
                const data: any = {
                    user: {
                        email: email,
                        name: profile.displayName || email,
                        status: UserStatus.ACTIVE,
                        credential: undefined
                    }
                }
                if (getRunningExpressApp().identityManager.getPlatformType() === Platform.CLOUD) {
                    const accountService = new AccountService()
                    const newAccount = await accountService.register(data)
                    wu = newAccount.workspaceUser
                    wu.workspace = newAccount.workspace
                    user = newAccount.user
                }
            } else {
                if (user.status === UserStatus.INVITED) {
                    const data: any = {
                        user: {
                            ...user,
                            email,
                            name: profile.displayName || '',
                            status: UserStatus.ACTIVE,
                            credential: undefined
                        }
                    }
                    const accountService = new AccountService()
                    const newAccount = await accountService.register(data)
                    user = newAccount.user
                }
                let wsUserOrUsers = await workspaceUserService.readWorkspaceUserByLastLogin(user?.id, queryRunner)
                wu = Array.isArray(wsUserOrUsers) && wsUserOrUsers.length > 0 ? wsUserOrUsers[0] : (wsUserOrUsers as WorkspaceUser)
            }

            const workspaceUser = wu as WorkspaceUser
            let roleService = new RoleService()
            const ownerRole = await roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)
            const role = await roleService.readRoleById(workspaceUser.roleId, queryRunner)
            if (!role) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, RoleErrorMessage.ROLE_NOT_FOUND)

            const workspaceUsers = await workspaceUserService.readWorkspaceUserByUserId(workspaceUser.userId, queryRunner)
            const assignedWorkspaces: IAssignedWorkspace[] = workspaceUsers.map((workspaceUser) => {
                return {
                    id: workspaceUser.workspace.id,
                    name: workspaceUser.workspace.name,
                    role: workspaceUser.role?.name,
                    organizationId: workspaceUser.workspace.organizationId
                } as IAssignedWorkspace
            })

            const organization = await organizationService.readOrganizationById(workspaceUser.workspace.organizationId, queryRunner)
            if (!organization) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Organization not found')
            const subscriptionId = organization.subscriptionId as string
            const customerId = organization.customerId as string
            const features = await getRunningExpressApp().identityManager.getFeaturesByPlan(subscriptionId)
            const productId = await getRunningExpressApp().identityManager.getProductIdFromSubscription(subscriptionId)

            const loggedInUser: LoggedInUser = {
                id: workspaceUser.userId,
                email: user?.email || '',
                name: user?.name || '',
                roleId: workspaceUser.roleId,
                activeOrganizationId: organization.id,
                activeOrganizationSubscriptionId: subscriptionId,
                activeOrganizationCustomerId: customerId,
                activeOrganizationProductId: productId,
                isOrganizationAdmin: workspaceUser.roleId === ownerRole?.id,
                activeWorkspaceId: workspaceUser.workspaceId,
                activeWorkspace: workspaceUser.workspace.name,
                assignedWorkspaces,
                ssoToken: accessToken as string,
                ssoRefreshToken: refreshToken,
                ssoProvider: ssoProviderName,
                permissions: [...JSON.parse(role.permissions)],
                features
            }
            return done(null, loggedInUser as Express.User, { message: 'Logged in Successfully' })
        } catch (error) {
            return done(
                { name: 'SSO_LOGIN_FAILED', message: ssoProviderName + ' Login failed! Please contact your administrator.' },
                undefined
            )
        } finally {
            if (queryRunner && !queryRunner.isReleased) await queryRunner.release()
        }
    }
}

export default SSOBase
