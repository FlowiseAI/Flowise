import bcrypt from 'bcryptjs'
import { removeFolderFromStorage } from 'flowise-components'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { StatusCodes } from 'http-status-codes'
import moment from 'moment'
import { DataSource, In, QueryRunner } from 'typeorm'
import { ApiKey } from '../../database/entities/ApiKey'
import { Assistant } from '../../database/entities/Assistant'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { ChatMessage } from '../../database/entities/ChatMessage'
import { ChatMessageFeedback } from '../../database/entities/ChatMessageFeedback'
import { Credential } from '../../database/entities/Credential'
import { CustomTemplate } from '../../database/entities/CustomTemplate'
import { Dataset } from '../../database/entities/Dataset'
import { DatasetRow } from '../../database/entities/DatasetRow'
import { DocumentStore } from '../../database/entities/DocumentStore'
import { DocumentStoreFileChunk } from '../../database/entities/DocumentStoreFileChunk'
import { Evaluation } from '../../database/entities/Evaluation'
import { EvaluationRun } from '../../database/entities/EvaluationRun'
import { Evaluator } from '../../database/entities/Evaluator'
import { Execution } from '../../database/entities/Execution'
import { Lead } from '../../database/entities/Lead'
import { Tool } from '../../database/entities/Tool'
import { UpsertHistory } from '../../database/entities/UpsertHistory'
import { Variable } from '../../database/entities/Variable'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { IdentityManager } from '../../IdentityManager'
import { Platform, UserPlan } from '../../Interface'
import { GeneralErrorMessage } from '../../utils/constants'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import logger from '../../utils/logger'
import { checkUsageLimit } from '../../utils/quotaUsage'
import { emitEvent, TelemetryEventCategory, TelemetryEventResult } from '../../utils/telemetry'
import { WorkspaceShared } from '../database/entities/EnterpriseEntities'
import { OrganizationUser, OrganizationUserStatus } from '../database/entities/organization-user.entity'
import { Organization, OrganizationName } from '../database/entities/organization.entity'
import { GeneralRole, Role } from '../database/entities/role.entity'
import { User, UserStatus } from '../database/entities/user.entity'
import { WorkspaceUser, WorkspaceUserStatus } from '../database/entities/workspace-user.entity'
import { Workspace, WorkspaceName } from '../database/entities/workspace.entity'
import { LoggedInUser, LoginActivityCode } from '../Interface.Enterprise'
import { destroyAllSessionsForUser } from '../middleware/passport/SessionPersistance'
import { getJWTAuthTokenSecret } from '../utils/authSecrets'
import { compareHash, getHash, getPasswordSaltRounds, hashNeedsUpgrade } from '../utils/encryption.util'
import { EMAIL_CHANGE_JWT_TYP, isEmailChangeJwtShape, signEmailChangeJwt, verifyEmailChangeJwt } from '../utils/emailChangeJwt.util'
import {
    isSmtpConfigured,
    sendEmailChangeConfirmationEmail,
    sendPasswordResetEmail,
    sendVerificationEmailForCloud,
    sendWorkspaceAdd,
    sendWorkspaceInvite
} from '../utils/sendEmail'
import { generateTempToken } from '../utils/tempTokenUtils'
import { getSecureAppUrl, getSecureTokenLink } from '../utils/url.util'
import { validatePasswordOrThrow } from '../utils/validation.util'
import auditService from './audit'
import { OrganizationUserErrorMessage, OrganizationUserService } from './organization-user.service'
import { OrganizationErrorMessage, OrganizationService } from './organization.service'
import { RoleErrorMessage, RoleService } from './role.service'
import { sanitizeUser } from '../../utils/sanitize.util'
import { UserErrorMessage, UserService } from './user.service'
import { WorkspaceUserErrorMessage, WorkspaceUserService } from './workspace-user.service'
import { WorkspaceErrorMessage, WorkspaceService } from './workspace.service'

/** Optional referral field for Stripe referral tracking in CLOUD; not a User entity column. */
type RegistrationUser = Partial<User> & { referral?: string }

export type AccountDTO = {
    user: RegistrationUser
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

    /** Cloud always sends; open source / enterprise require SMTP to be configured. */
    private canSendTransactionalEmail(): boolean {
        return this.identityManager.getPlatformType() === Platform.CLOUD || isSmtpConfigured()
    }

    private async sendInviteEmailIfAllowed(send: () => Promise<void>, context: string) {
        if (this.canSendTransactionalEmail()) {
            await send()
        } else {
            logger.warn(`Skipping transactional email (${context}): SMTP is not configured`)
        }
    }

    /** Prevents email-change JWTs from being consumed by verify / reset-password flows. */
    private assertNotEmailChangeJwt(token: string | undefined | null) {
        if (!isEmailChangeJwtShape(token)) return
        try {
            const payload = jwt.verify(token, getJWTAuthTokenSecret()) as JwtPayload
            if (payload.typ === EMAIL_CHANGE_JWT_TYP) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.EMAIL_CHANGE_USE_CONFIRM_LINK)
            }
        } catch (err) {
            if (err instanceof InternalFlowiseError) throw err
        }
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
        if (!this.canSendTransactionalEmail()) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, GeneralErrorMessage.SMTP_NOT_CONFIGURED)
        }
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
            const verificationLink = getSecureTokenLink('/verify', updateUserData.tempToken!)
            await sendVerificationEmailForCloud(email, verificationLink)

            await queryRunner.commitTransaction()
        } catch (error) {
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            await queryRunner.release()
        }

        return { message: 'success' }
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
                    const verificationLink = getSecureTokenLink('/verify', data.user.tempToken!)
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
                        ? getSecureTokenLink('/register', data.user.tempToken!)
                        : getSecureAppUrl('/register')
                await this.sendInviteEmailIfAllowed(
                    () => sendWorkspaceInvite(data.user.email!, data.workspace.name!, registerLink, this.identityManager.getPlatformType()),
                    'workspace-invite'
                )
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
                    registerLink = getSecureTokenLink('/register', data.user.tempToken!)
                } else {
                    registerLink = getSecureAppUrl('/register')
                }
                if (workspaceUser.length === 1) {
                    oldWorkspaceUser = workspaceUser[0]
                    if (oldWorkspaceUser.workspace.name === WorkspaceName.DEFAULT_PERSONAL_WORKSPACE) {
                        await this.sendInviteEmailIfAllowed(
                            () =>
                                sendWorkspaceInvite(
                                    data.user.email!,
                                    data.workspace.name!,
                                    registerLink,
                                    this.identityManager.getPlatformType()
                                ),
                            'workspace-invite'
                        )
                    } else {
                        await this.sendInviteEmailIfAllowed(
                            () =>
                                sendWorkspaceInvite(
                                    data.user.email!,
                                    data.workspace.name!,
                                    registerLink,
                                    this.identityManager.getPlatformType(),
                                    'update'
                                ),
                            'workspace-invite-update'
                        )
                    }
                } else {
                    await this.sendInviteEmailIfAllowed(
                        () =>
                            sendWorkspaceInvite(
                                data.user.email!,
                                data.workspace.name!,
                                registerLink,
                                this.identityManager.getPlatformType()
                            ),
                        'workspace-invite'
                    )
                }
            } else {
                data.organizationUser.updatedBy = data.user.createdBy

                const dashboardLink = getSecureAppUrl()
                await this.sendInviteEmailIfAllowed(
                    () => sendWorkspaceAdd(data.user.email!, data.workspace.name!, dashboardLink),
                    'workspace-add'
                )
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

            // If the stored hash was created with fewer salt rounds than the current minimum
            // (e.g. 5 before we increased to 10), rehash with the current rounds on successful login.
            if (hashNeedsUpgrade(user.credential!, getPasswordSaltRounds())) {
                try {
                    const newHash = getHash(data.user.credential!)
                    await this.userService.saveUser({ ...user, credential: newHash }, queryRunner)
                } catch (upgradeError) {
                    logger.warn(`Failed to upgrade password hash for user ${user.email}`, upgradeError)
                }
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
            this.assertNotEmailChangeJwt(data.user.tempToken)
            const user = await this.userService.readUserByToken(data.user.tempToken, queryRunner)
            if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
            data.user = user
            data.user.tempToken = null
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
        if (!this.canSendTransactionalEmail()) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, GeneralErrorMessage.SMTP_NOT_CONFIGURED)
        }
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
            const resetLink = getSecureTokenLink('/reset-password', data.user.tempToken!)
            await sendPasswordResetEmail(data.user.email!, resetLink)
            await queryRunner.commitTransaction()
        } catch (error) {
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            await queryRunner.release()
        }

        return { message: 'success' }
    }

    public async resetPassword(data: AccountDTO) {
        data = this.initializeAccountDTO(data)
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        try {
            if (!data.user.tempToken) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.INVALID_TEMP_TOKEN)
            this.assertNotEmailChangeJwt(data.user.tempToken)

            const user = await this.userService.readUserByEmail(data.user.email, queryRunner)
            if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
            if (!user.tempToken || user.tempToken !== data.user.tempToken)
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.INVALID_TEMP_TOKEN)

            const tokenExpiry = user.tokenExpiry
            if (!tokenExpiry) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.INVALID_TEMP_TOKEN)

            const tokenExpiryMoment = moment(tokenExpiry)
            if (!tokenExpiryMoment.isValid() || moment().isAfter(tokenExpiryMoment))
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.EXPIRED_TEMP_TOKEN)

            // @ts-ignore
            const password = data.user.password
            validatePasswordOrThrow(password)

            // all checks are done, now update the user password, don't forget to hash it and do not forget to clear the temp token
            // leave the user status and other details as is
            const salt = bcrypt.genSaltSync(getPasswordSaltRounds())
            // @ts-ignore
            const hash = bcrypt.hashSync(password, salt)
            data.user = user
            data.user.credential = hash
            data.user.tempToken = null
            data.user.tokenExpiry = null
            data.user.status = UserStatus.ACTIVE

            await queryRunner.startTransaction()
            data.user = await this.userService.saveUser(data.user, queryRunner)
            await queryRunner.commitTransaction()

            // Invalidate all sessions for this user after password reset
            await destroyAllSessionsForUser(user.id as string)
        } catch (error) {
            if (queryRunner && queryRunner.isTransactionActive) await queryRunner.rollbackTransaction()
            throw error
        } finally {
            if (queryRunner && !queryRunner.isReleased) await queryRunner.release()
        }

        return { message: 'success' }
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

    /**
     * Permanently deletes the logged-in user's account and all associated organization and workspace data.
     *
     * Only allowed on CLOUD platform. Validates that the user is the sole organization owner and that
     * the organization has a subscription, then runs a transaction that removes organization and
     * workspace memberships, deletes all workspace resources (chatflows, documents, evaluations,
     * datasets, etc.), anonymizes the user record for GDPR, cancels the Stripe subscription, removes
     * organization storage, and emits an audit event. Throws on validation failure or if the user is
     * not found.
     *
     * @param queryRunner - TypeORM query runner for the database transaction
     * @param loggedInUser - The authenticated user requesting account deletion
     * @param ipAddress - Client IP address (e.g. for audit/telemetry)
     * @returns A promise that resolves when deletion and cleanup complete, or rejects with an error
     */
    public async delete(queryRunner: QueryRunner, loggedInUser: LoggedInUser, ipAddress: string): Promise<void> {
        if (this.identityManager.getPlatformType() !== Platform.CLOUD)
            throw new InternalFlowiseError(StatusCodes.FORBIDDEN, GeneralErrorMessage.FORBIDDEN)
        if (!loggedInUser.id) throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, GeneralErrorMessage.UNAUTHORIZED)

        // Step 3.1: Find User ID by Email
        const user = await this.userService.readUserById(loggedInUser.id, queryRunner)
        if (!user) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)

        // Step 3.1: Find Organization Memberships and Roles
        const targetUserOrganizationMemberships = await this.organizationUserService.readOrganizationUserByUserId(user.id, queryRunner)
        if (!targetUserOrganizationMemberships?.length)
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationUserErrorMessage.ORGANIZATION_USER_NOT_FOUND)
        // Step 3.1.1: Verify that there is only one owner
        const organizationIdsWhereOwner = targetUserOrganizationMemberships
            .filter((organizationUser) => organizationUser.isOrgOwner)
            .map((organizationUser) => organizationUser)
        if (organizationIdsWhereOwner.length !== 1)
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, GeneralErrorMessage.NOT_ALLOWED_TO_DELETE_OWNER)
        const organizaiton = await this.organizationservice.readOrganizationById(organizationIdsWhereOwner[0].organizationId, queryRunner)
        if (!organizaiton?.subscriptionId)
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, OrganizationErrorMessage.ORGANIZATION_HAS_NO_SUBSCRIPTION)
        // Step 3.1.2: Verify how many people invited him as member
        const organizationsUserWasInvitedTo = targetUserOrganizationMemberships
            .filter((organizationUser) => !organizationUser.isOrgOwner)
            .map((organizationUser) => organizationUser.organizationId)

        // Step 3.3: Find All Members and Owner in the Organization
        const organizationUsers = await this.organizationUserService.readOrganizationUserByOrganizationId(organizaiton.id, queryRunner)
        if (!organizationUsers)
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, OrganizationUserErrorMessage.ORGANIZATION_USER_NOT_FOUND)
        const membershipsWhereUserWasInvited = organizationUsers
            .filter((organizationUser) => !organizationUser.isOrgOwner)
            .map((organizationUser) => organizationUser.userId)

        // Step 3.4: Find All Workspaces for the Organization
        const workspaceIds = (await queryRunner.manager.findBy(Workspace, { organizationId: organizaiton.id })).map(
            (workspace) => workspace.id
        )
        if (workspaceIds.length === 0) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, WorkspaceErrorMessage.WORKSPACE_NOT_FOUND)
        const chatflowIds = (await queryRunner.manager.findBy(ChatFlow, { workspaceId: In(workspaceIds) })).map((chatflow) => chatflow.id)
        const documentStoreIds = (await queryRunner.manager.findBy(DocumentStore, { workspaceId: In(workspaceIds) })).map(
            (documentStore) => documentStore.id
        )
        const evaluationIds = (await queryRunner.manager.findBy(Evaluation, { workspaceId: In(workspaceIds) })).map(
            (evaluation) => evaluation.id
        )
        const datasetIds = (await queryRunner.manager.findBy(Dataset, { workspaceId: In(workspaceIds) })).map((dataset) => dataset.id)

        // Step 4: Deletion Process
        await queryRunner.startTransaction()

        // Step 4.1: Delete Organization Users with Member Role
        await queryRunner.manager.delete(OrganizationUser, { userId: loggedInUser.id, organizationId: In(organizationsUserWasInvitedTo) })
        await queryRunner.manager.delete(OrganizationUser, {
            organizationId: organizaiton.id,
            userId: In(membershipsWhereUserWasInvited)
        })

        // Step 4.2: Delete Workspace Users
        await queryRunner.manager.delete(WorkspaceUser, { workspaceId: In(workspaceIds) })
        await queryRunner.manager.delete(WorkspaceUser, { userId: loggedInUser.id })

        // Step 4.3: Delete Roles created for the Organization
        await queryRunner.manager.delete(Role, { organizationId: organizaiton.id })

        // Step 4.4: Delete Workspace Child Data
        // Step 4.4.1: Delete Chat Messages
        await queryRunner.manager.delete(ChatMessageFeedback, { chatflowid: In(chatflowIds) })
        await queryRunner.manager.delete(ChatMessage, { chatflowid: In(chatflowIds) })

        // Step 4.4.2: Delete Upsert History
        await queryRunner.manager.delete(UpsertHistory, { chatflowid: In(chatflowIds) })
        await queryRunner.manager.delete(UpsertHistory, { chatflowid: In(documentStoreIds) }) // don't be alarm because we reuse the chatflowid for document store upsert history

        // Step 4.4.3: Delete Leads
        await queryRunner.manager.delete(Lead, { chatflowid: In(chatflowIds) })

        // Step 4.4.4: Delete Document Store Data
        await queryRunner.manager.delete(DocumentStoreFileChunk, { storeId: In(documentStoreIds) })
        await queryRunner.manager.delete(DocumentStore, { workspaceId: In(workspaceIds) })

        // Step 4.4.5: Delete Evaluation Data
        await queryRunner.manager.delete(EvaluationRun, { evaluationId: In(evaluationIds) })
        await queryRunner.manager.delete(Evaluation, { workspaceId: In(workspaceIds) })

        // Step 4.4.6: Delete Dataset Data
        await queryRunner.manager.delete(DatasetRow, { datasetId: In(datasetIds) })
        await queryRunner.manager.delete(Dataset, { workspaceId: In(workspaceIds) })

        // Step 4.4.7: Delete ChatFlows
        await queryRunner.manager.delete(ChatFlow, { workspaceId: In(workspaceIds) })

        // Step 4.4.8: Delete Other Workspace Resources
        await queryRunner.manager.delete(ApiKey, { workspaceId: In(workspaceIds) })
        await queryRunner.manager.delete(Variable, { workspaceId: In(workspaceIds) })
        await queryRunner.manager.delete(Tool, { workspaceId: In(workspaceIds) })
        await queryRunner.manager.delete(Credential, { workspaceId: In(workspaceIds) })
        await queryRunner.manager.delete(Assistant, { workspaceId: In(workspaceIds) })
        await queryRunner.manager.delete(Evaluator, { workspaceId: In(workspaceIds) })
        await queryRunner.manager.delete(CustomTemplate, { workspaceId: In(workspaceIds) })
        await queryRunner.manager.delete(Execution, { workspaceId: In(workspaceIds) })

        // Step 4.4.9: Delete Workspace
        await queryRunner.manager.delete(WorkspaceShared, { workspaceId: In(workspaceIds) })
        await queryRunner.manager.delete(Workspace, { id: In(workspaceIds) })

        // Step 5: Anonymize User Record (GDPR Compliance)
        user.name = UserStatus.DELETED
        user.email = `deleted_${user.id}_${Date.now()}@deleted.flowise`
        user.status = UserStatus.DELETED
        user.credential = null
        user.tokenExpiry = null
        user.tempToken = null
        await queryRunner.manager.save(User, user)

        // Step 6: Cancel Stripe Subscription
        await this.identityManager.cancelSubscription(organizaiton.subscriptionId)

        await queryRunner.commitTransaction()

        // Step 7: Delete Organization Folder from Storage
        await removeFolderFromStorage(organizaiton.id)

        await emitEvent({
            category: TelemetryEventCategory.AUDIT,
            eventType: 'account-deleted',
            actionType: 'delete',
            userId: user.id,
            orgId: organizaiton.id,
            resourceId: user.id,
            ipAddress: ipAddress,
            result: TelemetryEventResult.SUCCESS
        })
    }

    public async initiateEmailChange(userId: string, newEmail: string) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        try {
            await queryRunner.startTransaction()
            const user = await this.userService.readUserById(userId, queryRunner)
            if (!user?.email) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)

            const expiryInHours = process.env.INVITE_TOKEN_EXPIRY_IN_HOURS ? parseInt(process.env.INVITE_TOKEN_EXPIRY_IN_HOURS) : 24
            const { token, tokenExpiry } = signEmailChangeJwt(userId, newEmail, expiryInHours)

            const merged = queryRunner.manager.merge(User, user, {
                tempToken: token,
                tokenExpiry
            })
            await this.userService.saveUser(merged, queryRunner)

            const confirmLink = getSecureTokenLink('/confirm-email-change', token)
            await sendEmailChangeConfirmationEmail(user.email, confirmLink, newEmail)

            await queryRunner.commitTransaction()
        } catch (error) {
            if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction()
            throw error
        } finally {
            await queryRunner.release()
        }
    }

    public async confirmEmailChange(data: { user: { tempToken?: string } }) {
        const token = data.user?.tempToken
        if (!token) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.INVALID_TEMP_TOKEN)

        let userId: string
        let newEmail: string
        try {
            ;({ userId, newEmail } = verifyEmailChangeJwt(token))
        } catch (e) {
            if (e instanceof jwt.TokenExpiredError) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.EXPIRED_TEMP_TOKEN)
            }
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.INVALID_TEMP_TOKEN)
        }

        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        try {
            const user = await this.userService.readUserById(userId, queryRunner)
            if (!user || user.tempToken !== token) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)

            const taken = await this.userService.readUserByEmail(newEmail, queryRunner)
            if (taken && taken.id !== user.id) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.USER_EMAIL_ALREADY_EXISTS)
            }

            await this.userService.updateUser(
                {
                    id: user.id,
                    updatedBy: user.id,
                    email: newEmail,
                    tempToken: null,
                    tokenExpiry: null
                },
                {
                    onEmailChanged: (uid, em) => this.syncStripeCustomerEmailAfterUserEmailChange(uid, em)
                }
            )

            return { message: 'success' }
        } finally {
            await queryRunner.release()
        }
    }

    public async updateAuthenticatedUserProfile(
        currentUserId: string,
        body: Partial<User> & { oldPassword?: string; newPassword?: string; confirmPassword?: string },
        onEmailChanged: (userId: string, newEmail: string) => Promise<void>
    ) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        try {
            const dbUser = await this.userService.readUserById(currentUserId, queryRunner)
            if (!dbUser) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)

            const platform = this.identityManager.getPlatformType()
            const newEmailRaw = body.email?.trim()
            const emailChanging = newEmailRaw !== undefined && newEmailRaw.toLowerCase() !== (dbUser.email || '').toLowerCase()

            const useEmailChangeConfirmation = emailChanging && (platform === Platform.CLOUD || isSmtpConfigured())

            const passwordChanging = !!(body.oldPassword && body.newPassword && body.confirmPassword)
            const nameChanging = body.name !== undefined && body.name !== dbUser.name

            if (emailChanging && useEmailChangeConfirmation) {
                this.userService.validateUserEmail(newEmailRaw)
                const taken = await this.userService.readUserByEmail(newEmailRaw, queryRunner)
                if (taken && taken.id !== dbUser.id) {
                    throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.USER_EMAIL_ALREADY_EXISTS)
                }

                if (passwordChanging || nameChanging) {
                    await this.userService.updateUser(
                        {
                            id: currentUserId,
                            updatedBy: currentUserId,
                            name: body.name !== undefined ? body.name : dbUser.name,
                            email: dbUser.email,
                            oldPassword: body.oldPassword,
                            newPassword: body.newPassword,
                            confirmPassword: body.confirmPassword
                        },
                        {}
                    )
                }

                await this.initiateEmailChange(currentUserId, newEmailRaw!)

                const readRunner = this.dataSource.createQueryRunner()
                await readRunner.connect()
                try {
                    const refreshed = await this.userService.readUserById(currentUserId, readRunner)
                    return {
                        user: sanitizeUser({ ...refreshed }) as Partial<User>,
                        emailChangePending: true,
                        pendingEmail: newEmailRaw
                    }
                } finally {
                    await readRunner.release()
                }
            }

            if (emailChanging && !useEmailChangeConfirmation) {
                this.userService.validateUserEmail(newEmailRaw)
                const taken = await this.userService.readUserByEmail(newEmailRaw, queryRunner)
                if (taken && taken.id !== dbUser.id) {
                    throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, UserErrorMessage.USER_EMAIL_ALREADY_EXISTS)
                }

                const user = await this.userService.updateUser(
                    {
                        id: currentUserId,
                        updatedBy: currentUserId,
                        ...(body.name !== undefined ? { name: body.name } : {}),
                        email: body.email,
                        oldPassword: body.oldPassword,
                        newPassword: body.newPassword,
                        confirmPassword: body.confirmPassword,
                        tempToken: null,
                        tokenExpiry: null
                    },
                    { onEmailChanged }
                )
                return { user }
            }

            const user = await this.userService.updateUser(
                {
                    id: currentUserId,
                    updatedBy: currentUserId,
                    ...(body.name !== undefined ? { name: body.name } : {}),
                    ...(body.email !== undefined ? { email: body.email } : {}),
                    oldPassword: body.oldPassword,
                    newPassword: body.newPassword,
                    confirmPassword: body.confirmPassword
                },
                {}
            )
            return { user }
        } finally {
            await queryRunner.release()
        }
    }

    /**
     * Sync Stripe customer email when user changes their email (CLOUD only).
     * Expects exactly one org where the user is org owner; updates that org's Stripe customer email.
     */
    public async syncStripeCustomerEmailAfterUserEmailChange(userId: string, newEmail: string) {
        if (this.identityManager.getPlatformType() !== Platform.CLOUD) return

        let queryRunner: QueryRunner | undefined
        try {
            queryRunner = this.dataSource.createQueryRunner()
            await queryRunner.connect()
            const orgUsers = await this.organizationUserService.readOrganizationUserByUserId(userId, queryRunner)
            const ownerOrgLinks = orgUsers.filter((ou) => ou.isOrgOwner)
            if (ownerOrgLinks.length === 1) {
                const org = await this.organizationservice.readOrganizationById(ownerOrgLinks[0].organizationId, queryRunner)
                if (org?.customerId) {
                    await this.identityManager.updateStripeCustomerEmail(org.customerId, newEmail)
                }
            }
        } catch (error) {
            logger.warn(`Failed to update Stripe customer email for user ${userId}:`, error)
        } finally {
            if (queryRunner && !queryRunner.isReleased) await queryRunner.release()
        }
    }
}
