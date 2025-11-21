import bcrypt from 'bcryptjs'
import { StatusCodes } from 'http-status-codes'
import moment from 'moment'
import { DataSource, QueryRunner } from 'typeorm'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { IdentityManager } from '../../IdentityManager'
import { Platform, UserPlan } from '../../Interface'
import { GeneralErrorMessage } from '../../utils/constants'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { checkUsageLimit } from '../../utils/quotaUsage'
import { OrganizationUser, OrganizationUserStatus } from '../database/entities/organization-user.entity'
import { Organization, OrganizationName } from '../database/entities/organization.entity'
import { GeneralRole, Role } from '../database/entities/role.entity'
import { User, UserStatus } from '../database/entities/user.entity'
import { WorkspaceUser, WorkspaceUserStatus } from '../database/entities/workspace-user.entity'
import { Workspace, WorkspaceName } from '../database/entities/workspace.entity'
import { LoggedInUser, LoginActivityCode } from '../Interface.Enterprise'
import { compareHash } from '../utils/encryption.util'
import { sendPasswordResetEmail, sendVerificationEmailForCloud, sendWorkspaceAdd, sendWorkspaceInvite } from '../utils/sendEmail'
import { generateTempToken } from '../utils/tempTokenUtils'
import auditService from './audit'
import { OrganizationUserErrorMessage, OrganizationUserService } from './organization-user.service'
import { OrganizationErrorMessage, OrganizationService } from './organization.service'
import { RoleErrorMessage, RoleService } from './role.service'
import { UserErrorMessage, UserService } from './user.service'
import { WorkspaceUserErrorMessage, WorkspaceUserService } from './workspace-user.service'
import { WorkspaceErrorMessage, WorkspaceService } from './workspace.service'
import { sanitizeUser } from '../../utils/sanitize.util'
import { destroyAllSessionsForUser } from '../middleware/passport/SessionPersistance'

type AccountDTO = {
    user: Partial<User>
    organization: Partial<Organization>
    organizationUser: Partial<OrganizationUser>
    workspace: Partial<Workspace>
    workspaceUser: Partial<WorkspaceUser>
    role: Partial<Role>
}

export class AccountService {
    private dataSource: DataSource
    private userService: UserService
    private organizationservice: OrganizationService
    private workspaceService: WorkspaceService
    private roleService: RoleService
    private organizationUserService: OrganizationUserService
    private workspaceUserService: WorkspaceUserService
    private identityManager: IdentityManager

    constructor() {
        const appServer = getRunningExpressApp()
        this.dataSource = appServer.AppDataSource
        this.userService = new UserService()
        this.organizationservice = new OrganizationService()
        this.workspaceService = new WorkspaceService()
        this.roleService = new RoleService()
        this.organizationUserService = new OrganizationUserService()
        this.workspaceUserService = new WorkspaceUserService()
        this.identityManager = appServer.identityManager
    }

    private initializeAccountDTO(data: AccountDTO) {
        data.organization = data.organization || {}
        data.organizationUser = data.organizationUser || {}
        data.workspace = data.workspace || {}
        data.workspaceUser = data.workspaceUser || {}
        data.role = data.role || {}

        return data
    }

    public async resendVerificationEmail({ email }: { email: string }) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        try {
            await queryRunner.startTransaction()

            const user = await this.userService.readUserByEmail(email, queryRunner)
            if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
            if (user && user.status === UserStatus.ACTIVE)
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_EMAIL_ALREADY_EXISTS)

            if (!user.email) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.INVALID_USER_EMAIL)

            const updateUserData: Partial<User> = {}
            updateUserData.tempToken = generateTempToken()
            const tokenExpiry = new Date()
            const expiryInHours = process.env.INVITE_TOKEN_EXPIRY_IN_HOURS ? parseInt(process.env.INVITE_TOKEN_EXPIRY_IN_HOURS) : 24
            tokenExpiry.setHours(tokenExpiry.getHours() + expiryInHours)
            updateUserData.tokenExpiry = tokenExpiry

            // Update user with new token and expiry
            const updatedUser = queryRunner.manager.merge(User, user, updateUserData)
            await queryRunner.manager.save(User, updatedUser)

            // resend invite
            const verificationLink = `${process.env.APP_URL}/verify?token=${updateUserData.tempToken}`
            await sendVerificationEmailForCloud(email, verificationLink)

            await queryRunner.commitTransaction()
        } catch (error) {
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            await queryRunner.release()
        }
    }

    private async ensureOneOrganizationOnly(queryRunner: QueryRunner) {
        const organizations = await this.organizationservice.readOrganization(queryRunner)
        if (organizations.length > 0) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'You can only have one organization')
    }

    private async createRegisterAccount(data: AccountDTO, queryRunner: QueryRunner) {
        data = this.initializeAccountDTO(data)

        const platform = this.identityManager.getPlatformType()

        switch (platform) {
            case Platform.OPEN_SOURCE:
                await this.ensureOneOrganizationOnly(queryRunner)
                data.organization.name = OrganizationName.DEFAULT_ORGANIZATION
                data.organizationUser.role = await this.roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)
                data.workspace.name = WorkspaceName.DEFAULT_WORKSPACE
                data.workspaceUser.role = data.organizationUser.role
                data.user.status = UserStatus.ACTIVE
                data.user = await this.userService.createNewUser(data.user, queryRunner)
                break
            case Platform.CLOUD: {
                const user = await this.userService.readUserByEmail(data.user.email, queryRunner)
                if (user && (user.status === UserStatus.ACTIVE || user.status === UserStatus.UNVERIFIED))
                    throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_EMAIL_ALREADY_EXISTS)

                if (!data.user.email) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.INVALID_USER_EMAIL)
                const { customerId, subscriptionId } = await this.identityManager.createStripeUserAndSubscribe({
                    email: data.user.email,
                    userPlan: UserPlan.FREE,
                    // @ts-ignore
                    referral: data.user.referral || ''
                })
                data.organization.customerId = customerId
                data.organization.subscriptionId = subscriptionId

                // if credential exists then the user is signing up with email/password
                // if not then the user is signing up with oauth/sso
                if (data.user.credential) {
                    data.user.status = UserStatus.UNVERIFIED
                    data.user.tempToken = generateTempToken()
                    const tokenExpiry = new Date()
                    const expiryInHours = process.env.INVITE_TOKEN_EXPIRY_IN_HOURS ? parseInt(process.env.INVITE_TOKEN_EXPIRY_IN_HOURS) : 24
                    tokenExpiry.setHours(tokenExpiry.getHours() + expiryInHours)
                    data.user.tokenExpiry = tokenExpiry
                } else {
                    data.user.status = UserStatus.ACTIVE
                    data.user.tempToken = ''
                    data.user.tokenExpiry = null
                }
                data.organization.name = OrganizationName.DEFAULT_ORGANIZATION
                data.organizationUser.role = await this.roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)
                data.workspace.name = WorkspaceName.DEFAULT_WORKSPACE
                data.workspaceUser.role = data.organizationUser.role
                if (!user) {
                    data.user = await this.userService.createNewUser(data.user, queryRunner)
                } else {
                    if (data.user.credential) data.user.credential = this.userService.encryptUserCredential(data.user.credential)
                    data.user.updatedBy = user.id
                    data.user = queryRunner.manager.merge(User, user, data.user)
                }
                // send verification email only if user signed up with email/password
                if (data.user.credential) {
                    const verificationLink = `${process.env.APP_URL}/verify?token=${data.user.tempToken}`
                    await sendVerificationEmailForCloud(data.user.email!, verificationLink)
                }
                break
            }
            case Platform.ENTERPRISE: {
                if (data.user.tempToken) {
                    const user = await this.userService.readUserByToken(data.user.tempToken, queryRunner)
                    if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
                    if (user.email.toLowerCase() !== data.user.email?.toLowerCase())
                        throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.INVALID_USER_EMAIL)
                    const name = data.user.name
                    if (data.user.credential) user.credential = this.userService.encryptUserCredential(data.user.credential)
                    data.user = user
                    const organizationUser = await this.organizationUserService.readOrganizationUserByUserId(user.id, queryRunner)
                    if (!organizationUser)
                        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationUserErrorMessage.ORGANIZATION_USER_NOT_FOUND)
                    const assignedOrganization = await this.organizationservice.readOrganizationById(
                        organizationUser[0].organizationId,
                        queryRunner
                    )
                    if (!assignedOrganization)
                        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationErrorMessage.ORGANIZATION_NOT_FOUND)
                    data.organization = assignedOrganization
                    const tokenExpiry = new Date(user.tokenExpiry!)
                    const today = new Date()
                    if (today > tokenExpiry) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.EXPIRED_TEMP_TOKEN)
                    data.user.tempToken = ''
                    data.user.tokenExpiry = null
                    data.user.name = name
                    data.user.status = UserStatus.ACTIVE
                    data.organizationUser.status = OrganizationUserStatus.ACTIVE
                    data.organizationUser.role = await this.roleService.readGeneralRoleByName(GeneralRole.MEMBER, queryRunner)
                    data.workspace.name = WorkspaceName.DEFAULT_PERSONAL_WORKSPACE
                    data.workspaceUser.role = await this.roleService.readGeneralRoleByName(GeneralRole.PERSONAL_WORKSPACE, queryRunner)
                } else {
                    await this.ensureOneOrganizationOnly(queryRunner)
                    data.organizationUser.role = await this.roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)
                    data.workspace.name = WorkspaceName.DEFAULT_WORKSPACE
                    data.workspaceUser.role = data.organizationUser.role
                    data.user.status = UserStatus.ACTIVE
                    data.user = await this.userService.createNewUser(data.user, queryRunner)
                }
                break
            }
            default:
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, GeneralErrorMessage.UNHANDLED_EDGE_CASE)
        }

        if (!data.organization.id) {
            data.organization.createdBy = data.user.createdBy
            data.organization = this.organizationservice.createNewOrganization(data.organization, queryRunner, true)
        }
        data.organizationUser.organizationId = data.organization.id
        data.organizationUser.userId = data.user.id
        data.organizationUser.createdBy = data.user.createdBy
        data.organizationUser = this.organizationUserService.createNewOrganizationUser(data.organizationUser, queryRunner)
        data.workspace.organizationId = data.organization.id
        data.workspace.createdBy = data.user.createdBy
        data.workspace = this.workspaceService.createNewWorkspace(data.workspace, queryRunner, true)
        data.workspaceUser.workspaceId = data.workspace.id
        data.workspaceUser.userId = data.user.id
        data.workspaceUser.createdBy = data.user.createdBy
        data.workspaceUser.status = WorkspaceUserStatus.ACTIVE
        data.workspaceUser = this.workspaceUserService.createNewWorkspaceUser(data.workspaceUser, queryRunner)

        return data
    }

    private async saveRegisterAccount(data: AccountDTO) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        const platform = this.identityManager.getPlatformType()
        const ownerRole = await this.roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)

        try {
            data = await this.createRegisterAccount(data, queryRunner)

            await queryRunner.startTransaction()
            data.user = await this.userService.saveUser(data.user, queryRunner)
            data.organization = await this.organizationservice.saveOrganization(data.organization, queryRunner)
            data.organizationUser = await this.organizationUserService.saveOrganizationUser(data.organizationUser, queryRunner)
            data.workspace = await this.workspaceService.saveWorkspace(data.workspace, queryRunner)
            data.workspaceUser = await this.workspaceUserService.saveWorkspaceUser(data.workspaceUser, queryRunner)
            if (
                data.workspace.id &&
                (platform === Platform.OPEN_SOURCE || platform === Platform.ENTERPRISE) &&
                ownerRole.id === data.organizationUser.roleId
            ) {
                await this.workspaceService.setNullWorkspaceId(queryRunner, data.workspace.id)
            }
            await queryRunner.commitTransaction()

            delete data.user.credential
            delete data.user.tempToken
            delete data.user.tokenExpiry

            return data
        } catch (error) {
            if (queryRunner && queryRunner.isTransactionActive) await queryRunner.rollbackTransaction()
            throw error
        } finally {
            if (queryRunner && !queryRunner.isReleased) await queryRunner.release()
        }
    }

    public async register(data: AccountDTO) {
        return await this.saveRegisterAccount(data)
    }

    private async saveInviteAccount(data: AccountDTO, currentUser?: Express.User) {
        data = this.initializeAccountDTO(data)
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        try {
            const workspace = await this.workspaceService.readWorkspaceById(data.workspace.id, queryRunner)
            if (!workspace) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, WorkspaceErrorMessage.WORKSPACE_NOT_FOUND)
            data.workspace = workspace

            const totalOrgUsers = await this.organizationUserService.readOrgUsersCountByOrgId(data.workspace.organizationId || '')
            const subscriptionId = currentUser?.activeOrganizationSubscriptionId || ''

            const role = await this.roleService.readRoleByRoleIdOrganizationId(data.role.id, data.workspace.organizationId, queryRunner)
            if (!role) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, RoleErrorMessage.ROLE_NOT_FOUND)
            data.role = role
            const user = await this.userService.readUserByEmail(data.user.email, queryRunner)
            if (!user) {
                await checkUsageLimit('users', subscriptionId, getRunningExpressApp().usageCacheManager, totalOrgUsers + 1)

                // generate a temporary token
                data.user.tempToken = generateTempToken()
                const tokenExpiry = new Date()
                // set expiry based on env setting and fallback to 24 hours
                const expiryInHours = process.env.INVITE_TOKEN_EXPIRY_IN_HOURS ? parseInt(process.env.INVITE_TOKEN_EXPIRY_IN_HOURS) : 24
                tokenExpiry.setHours(tokenExpiry.getHours() + expiryInHours)
                data.user.tokenExpiry = tokenExpiry
                data.user.status = UserStatus.INVITED
                // send invite
                const registerLink =
                    this.identityManager.getPlatformType() === Platform.ENTERPRISE
                        ? `${process.env.APP_URL}/register?token=${data.user.tempToken}`
                        : `${process.env.APP_URL}/register`
                await sendWorkspaceInvite(data.user.email!, data.workspace.name!, registerLink, this.identityManager.getPlatformType())
                data.user = await this.userService.createNewUser(data.user, queryRunner)

                data.organizationUser.organizationId = data.workspace.organizationId
                data.organizationUser.userId = data.user.id
                const roleMember = await this.roleService.readGeneralRoleByName(GeneralRole.MEMBER, queryRunner)
                data.organizationUser.roleId = roleMember.id
                data.organizationUser.createdBy = data.user.createdBy
                data.organizationUser.status = OrganizationUserStatus.INVITED
                data.organizationUser = await this.organizationUserService.createNewOrganizationUser(data.organizationUser, queryRunner)

                workspace.updatedBy = data.user.createdBy

                data.workspaceUser.workspaceId = data.workspace.id
                data.workspaceUser.userId = data.user.id
                data.workspaceUser.roleId = data.role.id
                data.workspaceUser.createdBy = data.user.createdBy
                data.workspaceUser.status = WorkspaceUserStatus.INVITED
                data.workspaceUser = await this.workspaceUserService.createNewWorkspaceUser(data.workspaceUser, queryRunner)

                await queryRunner.startTransaction()
                data.user = await this.userService.saveUser(data.user, queryRunner)
                await this.workspaceService.saveWorkspace(workspace, queryRunner)
                data.organizationUser = await this.organizationUserService.saveOrganizationUser(data.organizationUser, queryRunner)
                data.workspaceUser = await this.workspaceUserService.saveWorkspaceUser(data.workspaceUser, queryRunner)
                data.role = await this.roleService.saveRole(data.role, queryRunner)
                await queryRunner.commitTransaction()
                delete data.user.credential
                delete data.user.tempToken
                delete data.user.tokenExpiry

                return data
            }
            const { organizationUser } = await this.organizationUserService.readOrganizationUserByOrganizationIdUserId(
                data.workspace.organizationId,
                user.id,
                queryRunner
            )
            if (!organizationUser) {
                await checkUsageLimit('users', subscriptionId, getRunningExpressApp().usageCacheManager, totalOrgUsers + 1)
                data.organizationUser.organizationId = data.workspace.organizationId
                data.organizationUser.userId = user.id
                const roleMember = await this.roleService.readGeneralRoleByName(GeneralRole.MEMBER, queryRunner)
                data.organizationUser.roleId = roleMember.id
                data.organizationUser.createdBy = data.user.createdBy
                data.organizationUser.status = OrganizationUserStatus.INVITED
                data.organizationUser = await this.organizationUserService.createNewOrganizationUser(data.organizationUser, queryRunner)
            } else {
                data.organizationUser = organizationUser
            }

            let oldWorkspaceUser
            if (data.organizationUser.status === OrganizationUserStatus.INVITED) {
                const workspaceUser = await this.workspaceUserService.readWorkspaceUserByOrganizationIdUserId(
                    data.workspace.organizationId,
                    user.id,
                    queryRunner
                )
                let registerLink: string
                if (this.identityManager.getPlatformType() === Platform.ENTERPRISE) {
                    data.user = user
                    data.user.tempToken = generateTempToken()
                    const tokenExpiry = new Date()
                    const expiryInHours = process.env.INVITE_TOKEN_EXPIRY_IN_HOURS ? parseInt(process.env.INVITE_TOKEN_EXPIRY_IN_HOURS) : 24
                    tokenExpiry.setHours(tokenExpiry.getHours() + expiryInHours)
                    data.user.tokenExpiry = tokenExpiry
                    await this.userService.saveUser(data.user, queryRunner)
                    registerLink = `${process.env.APP_URL}/register?token=${data.user.tempToken}`
                } else {
                    registerLink = `${process.env.APP_URL}/register`
                }
                if (workspaceUser.length === 1) {
                    oldWorkspaceUser = workspaceUser[0]
                    if (oldWorkspaceUser.workspace.name === WorkspaceName.DEFAULT_PERSONAL_WORKSPACE) {
                        await sendWorkspaceInvite(
                            data.user.email!,
                            data.workspace.name!,
                            registerLink,
                            this.identityManager.getPlatformType()
                        )
                    } else {
                        await sendWorkspaceInvite(
                            data.user.email!,
                            data.workspace.name!,
                            registerLink,
                            this.identityManager.getPlatformType(),
                            'update'
                        )
                    }
                } else {
                    await sendWorkspaceInvite(data.user.email!, data.workspace.name!, registerLink, this.identityManager.getPlatformType())
                }
            } else {
                data.organizationUser.updatedBy = data.user.createdBy

                const dashboardLink = `${process.env.APP_URL}`
                await sendWorkspaceAdd(data.user.email!, data.workspace.name!, dashboardLink)
            }

            workspace.updatedBy = data.user.createdBy

            data.workspaceUser.workspaceId = data.workspace.id
            data.workspaceUser.userId = user.id
            data.workspaceUser.roleId = data.role.id
            data.workspaceUser.createdBy = data.user.createdBy
            data.workspaceUser.status = WorkspaceUserStatus.INVITED
            data.workspaceUser = await this.workspaceUserService.createNewWorkspaceUser(data.workspaceUser, queryRunner)

            const personalWorkspaceRole = await this.roleService.readGeneralRoleByName(GeneralRole.PERSONAL_WORKSPACE, queryRunner)
            if (oldWorkspaceUser && oldWorkspaceUser.roleId !== personalWorkspaceRole.id) {
                await this.workspaceUserService.deleteWorkspaceUser(oldWorkspaceUser.workspaceId, user.id)
            }

            await queryRunner.startTransaction()
            data.organizationUser = await this.organizationUserService.saveOrganizationUser(data.organizationUser, queryRunner)
            await this.workspaceService.saveWorkspace(workspace, queryRunner)
            data.workspaceUser = await this.workspaceUserService.saveWorkspaceUser(data.workspaceUser, queryRunner)
            data.role = await this.roleService.saveRole(data.role, queryRunner)
            await queryRunner.commitTransaction()

            return data
        } catch (error) {
            if (queryRunner && queryRunner.isTransactionActive) await queryRunner.rollbackTransaction()
            throw error
        } finally {
            if (queryRunner && !queryRunner.isReleased) await queryRunner.release()
        }
    }

    public async invite(data: AccountDTO, user?: Express.User) {
        return await this.saveInviteAccount(data, user)
    }

    public async login(data: AccountDTO) {
        data = this.initializeAccountDTO(data)
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        const platform = this.identityManager.getPlatformType()
        try {
            if (!data.user.credential) {
                await auditService.recordLoginActivity(data.user.email || '', LoginActivityCode.INCORRECT_CREDENTIAL, 'Login Failed')
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.INVALID_USER_CREDENTIAL)
            }
            const user = await this.userService.readUserByEmail(data.user.email, queryRunner)
            if (!user) {
                await auditService.recordLoginActivity(data.user.email || '', LoginActivityCode.UNKNOWN_USER, 'Login Failed')
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
            }
            if (!user.credential) {
                await auditService.recordLoginActivity(user.email || '', LoginActivityCode.INCORRECT_CREDENTIAL, 'Login Failed')
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.INVALID_USER_CREDENTIAL)
            }
            if (!compareHash(data.user.credential, user.credential)) {
                await auditService.recordLoginActivity(user.email || '', LoginActivityCode.INCORRECT_CREDENTIAL, 'Login Failed')
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, UserErrorMessage.INCORRECT_USER_EMAIL_OR_CREDENTIALS)
            }
            if (user.status === UserStatus.UNVERIFIED) {
                await auditService.recordLoginActivity(data.user.email || '', LoginActivityCode.REGISTRATION_PENDING, 'Login Failed')
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, UserErrorMessage.USER_EMAIL_UNVERIFIED)
            }
            let wsUserOrUsers = await this.workspaceUserService.readWorkspaceUserByLastLogin(user.id, queryRunner)
            if (Array.isArray(wsUserOrUsers)) {
                if (wsUserOrUsers.length > 0) {
                    wsUserOrUsers = wsUserOrUsers[0]
                } else {
                    await auditService.recordLoginActivity(user.email || '', LoginActivityCode.NO_ASSIGNED_WORKSPACE, 'Login Failed')
                    throw new InternalFlowiseError(StatusCodes.NOT_FOUND, WorkspaceUserErrorMessage.WORKSPACE_USER_NOT_FOUND)
                }
            }
            if (platform === Platform.ENTERPRISE) {
                await auditService.recordLoginActivity(user.email, LoginActivityCode.LOGIN_SUCCESS, 'Login Success')
            }
            return { user, workspaceDetails: wsUserOrUsers }
        } finally {
            await queryRunner.release()
        }
    }

    public async verify(data: AccountDTO) {
        data = this.initializeAccountDTO(data)
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        try {
            await queryRunner.startTransaction()
            if (!data.user.tempToken) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.INVALID_TEMP_TOKEN)
            const user = await this.userService.readUserByToken(data.user.tempToken, queryRunner)
            if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
            data.user = user
            data.user.tempToken = ''
            data.user.tokenExpiry = null
            data.user.status = UserStatus.ACTIVE
            data.user = await this.userService.saveUser(data.user, queryRunner)
            await queryRunner.commitTransaction()
        } catch (error) {
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            await queryRunner.release()
        }

        return data
    }

    public async forgotPassword(data: AccountDTO) {
        data = this.initializeAccountDTO(data)
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        try {
            await queryRunner.startTransaction()
            const user = await this.userService.readUserByEmail(data.user.email, queryRunner)
            if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)

            data.user = user
            data.user.tempToken = generateTempToken()
            const tokenExpiry = new Date()
            const expiryInMins = process.env.PASSWORD_RESET_TOKEN_EXPIRY_IN_MINUTES
                ? parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRY_IN_MINUTES)
                : 15
            tokenExpiry.setMinutes(tokenExpiry.getMinutes() + expiryInMins)
            data.user.tokenExpiry = tokenExpiry
            data.user = await this.userService.saveUser(data.user, queryRunner)
            const resetLink = `${process.env.APP_URL}/reset-password?token=${data.user.tempToken}`
            await sendPasswordResetEmail(data.user.email!, resetLink)
            await queryRunner.commitTransaction()
        } catch (error) {
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            await queryRunner.release()
        }

        return sanitizeUser(data.user)
    }

    public async resetPassword(data: AccountDTO) {
        data = this.initializeAccountDTO(data)
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        try {
            const user = await this.userService.readUserByEmail(data.user.email, queryRunner)
            if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
            if (user.tempToken !== data.user.tempToken)
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.INVALID_TEMP_TOKEN)

            const tokenExpiry = user.tokenExpiry
            const now = moment()
            const expiryInMins = process.env.PASSWORD_RESET_TOKEN_EXPIRY_IN_MINUTES
                ? parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRY_IN_MINUTES)
                : 15
            const diff = now.diff(tokenExpiry, 'minutes')
            if (Math.abs(diff) > expiryInMins) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.EXPIRED_TEMP_TOKEN)

            // all checks are done, now update the user password, don't forget to hash it and do not forget to clear the temp token
            // leave the user status and other details as is
            const salt = bcrypt.genSaltSync(parseInt(process.env.PASSWORD_SALT_HASH_ROUNDS || '5'))
            // @ts-ignore
            const hash = bcrypt.hashSync(data.user.password, salt)
            data.user = user
            data.user.credential = hash
            data.user.tempToken = ''
            data.user.tokenExpiry = undefined
            data.user.status = UserStatus.ACTIVE

            await queryRunner.startTransaction()
            data.user = await this.userService.saveUser(data.user, queryRunner)
            await queryRunner.commitTransaction()

            // Invalidate all sessions for this user after password reset
            await destroyAllSessionsForUser(user.id as string)
        } catch (error) {
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            await queryRunner.release()
        }

        return sanitizeUser(data.user)
    }

    public async logout(user: LoggedInUser) {
        const platform = this.identityManager.getPlatformType()
        if (platform === Platform.ENTERPRISE) {
            await auditService.recordLoginActivity(
                user.email,
                LoginActivityCode.LOGOUT_SUCCESS,
                'Logout Success',
                user.ssoToken ? 'SSO' : 'Email/Password'
            )
        }
    }
}
