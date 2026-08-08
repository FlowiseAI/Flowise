import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { QueryRunner } from 'typeorm'
import { Platform } from '../../Interface'
import { UserStatus } from '../database/entities/user.entity'
import { UserErrorMessage } from '../services/user.service'

const mockReadUserByEmail = jest.fn() as jest.MockedFunction<(_email: string, _queryRunner: QueryRunner) => Promise<any>>
const mockBindSSOIdentity = jest.fn() as jest.MockedFunction<
    (_userId: string, _ssoProvider: string, _ssoSubjectId: string, _queryRunner: QueryRunner) => Promise<any>
>
const mockCreateQueryRunner = jest.fn() as jest.MockedFunction<() => any>
const mockGetPlatformType = jest.fn() as jest.MockedFunction<() => Platform>
const mockGetFeaturesByPlan = jest.fn() as jest.MockedFunction<(_subscriptionId: string) => Promise<any>>
const mockGetProductIdFromSubscription = jest.fn() as jest.MockedFunction<(_subscriptionId: string) => Promise<any>>
const mockReadWorkspaceUserByLastLogin = jest.fn() as jest.MockedFunction<(_userId: string, _queryRunner: QueryRunner) => Promise<any>>
const mockReadWorkspaceUserByUserId = jest.fn() as jest.MockedFunction<(_userId: string, _queryRunner: QueryRunner) => Promise<any>>
const mockReadGeneralRoleByName = jest.fn() as jest.MockedFunction<(_name: string, _queryRunner: QueryRunner) => Promise<any>>
const mockReadRoleById = jest.fn() as jest.MockedFunction<(_id: string, _queryRunner: QueryRunner) => Promise<any>>
const mockReadOrganizationById = jest.fn() as jest.MockedFunction<(_id: string, _queryRunner: QueryRunner) => Promise<any>>
const mockRecordLoginActivity = jest.fn() as jest.MockedFunction<(..._args: any[]) => Promise<any>>

jest.mock('../../utils/getRunningExpressApp', () => ({
    getRunningExpressApp: jest.fn().mockImplementation(() => ({
        AppDataSource: { createQueryRunner: mockCreateQueryRunner },
        identityManager: {
            getPlatformType: mockGetPlatformType,
            getFeaturesByPlan: mockGetFeaturesByPlan,
            getProductIdFromSubscription: mockGetProductIdFromSubscription
        }
    }))
}))

jest.mock('../services/user.service', () => ({
    UserService: jest.fn().mockImplementation(() => ({
        readUserByEmail: mockReadUserByEmail,
        bindSSOIdentity: mockBindSSOIdentity
    }))
}))

jest.mock('../services/organization.service', () => ({
    OrganizationService: jest.fn().mockImplementation(() => ({ readOrganizationById: mockReadOrganizationById }))
}))

jest.mock('../services/workspace-user.service', () => ({
    WorkspaceUserService: jest.fn().mockImplementation(() => ({
        readWorkspaceUserByLastLogin: mockReadWorkspaceUserByLastLogin,
        readWorkspaceUserByUserId: mockReadWorkspaceUserByUserId
    }))
}))

jest.mock('../services/role.service', () => ({
    RoleService: jest.fn().mockImplementation(() => ({
        readGeneralRoleByName: mockReadGeneralRoleByName,
        readRoleById: mockReadRoleById
    }))
}))

jest.mock('../services/audit', () => ({
    __esModule: true,
    default: { recordLoginActivity: mockRecordLoginActivity }
}))

import SSOBase from './SSOBase'

class TestSSO extends SSOBase {
    getProviderName(): string {
        return 'Test SSO'
    }
    initialize(): void {}
    async refreshToken(): Promise<{ [key: string]: any }> {
        return {}
    }
}

function makeQueryRunner() {
    return { connect: jest.fn(), release: jest.fn(), isReleased: false }
}

const WORKSPACE_USER = {
    userId: 'user-1',
    roleId: 'role-1',
    workspaceId: 'workspace-1',
    workspace: { id: 'workspace-1', name: 'Default Workspace', organizationId: 'org-1' }
}

function mockHappyPathDependencies() {
    mockReadWorkspaceUserByLastLogin.mockResolvedValue(WORKSPACE_USER)
    mockReadWorkspaceUserByUserId.mockResolvedValue([{ ...WORKSPACE_USER, role: { name: 'Owner' } }])
    mockReadGeneralRoleByName.mockResolvedValue({ id: 'role-1' })
    mockReadRoleById.mockResolvedValue({ id: 'role-1', permissions: '[]' })
    mockReadOrganizationById.mockResolvedValue({ id: 'org-1', subscriptionId: 'sub-1', customerId: 'cust-1' })
    mockGetFeaturesByPlan.mockResolvedValue({})
    mockGetProductIdFromSubscription.mockResolvedValue('product-1')
}

describe('SSOBase.verifyAndLogin', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockGetPlatformType.mockReturnValue(Platform.ENTERPRISE)
    })

    it('rejects an INVITED user instead of auto-activating them (invite-token bypass fix)', async () => {
        const queryRunner = makeQueryRunner()
        mockCreateQueryRunner.mockReturnValue(queryRunner)
        mockReadUserByEmail.mockResolvedValue({
            id: 'user-1',
            email: 'invitee@example.com',
            status: UserStatus.INVITED,
            tempToken: 'secret-invite-token',
            tokenExpiry: new Date(Date.now() + 3600_000)
        })

        const sso = new TestSSO({} as any)
        const done = jest.fn()

        await sso.verifyAndLogin(
            {} as any,
            'invitee@example.com',
            done,
            { displayName: 'Attacker' } as any,
            'access-token',
            'refresh-token'
        )

        expect(mockReadUserByEmail).toHaveBeenCalledWith('invitee@example.com', queryRunner)
        expect(done).toHaveBeenCalledWith(
            { name: 'SSO_LOGIN_FAILED', message: UserErrorMessage.USER_INVITED_PENDING_ACTIVATION },
            undefined
        )
        expect(queryRunner.release).toHaveBeenCalled()
    })

    it('binds an ACTIVE user to their SSO identity on first login (trust-on-first-use)', async () => {
        const queryRunner = makeQueryRunner()
        mockCreateQueryRunner.mockReturnValue(queryRunner)
        mockReadUserByEmail.mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            status: UserStatus.ACTIVE,
            ssoProvider: null,
            ssoSubjectId: null
        })
        mockHappyPathDependencies()

        const sso = new TestSSO({} as any)
        const done = jest.fn()

        await sso.verifyAndLogin({} as any, 'user@example.com', done, { id: 'sub-123', displayName: 'User' } as any, 'at', 'rt')

        expect(mockBindSSOIdentity).toHaveBeenCalledWith('user-1', 'Test SSO', 'sub-123', queryRunner)
        expect(done).toHaveBeenCalledWith(null, expect.objectContaining({ id: 'user-1' }), { message: 'Logged in Successfully' })
    })

    it('allows a returning SSO login whose identity matches the stored binding', async () => {
        const queryRunner = makeQueryRunner()
        mockCreateQueryRunner.mockReturnValue(queryRunner)
        mockReadUserByEmail.mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            status: UserStatus.ACTIVE,
            ssoProvider: 'Test SSO',
            ssoSubjectId: 'sub-123'
        })
        mockHappyPathDependencies()

        const sso = new TestSSO({} as any)
        const done = jest.fn()

        await sso.verifyAndLogin({} as any, 'user@example.com', done, { id: 'sub-123', displayName: 'User' } as any, 'at', 'rt')

        expect(mockBindSSOIdentity).not.toHaveBeenCalled()
        expect(done).toHaveBeenCalledWith(null, expect.objectContaining({ id: 'user-1' }), { message: 'Logged in Successfully' })
    })

    it('rejects a login whose SSO identity does not match the stored binding (cross-provider account takeover attempt)', async () => {
        const queryRunner = makeQueryRunner()
        mockCreateQueryRunner.mockReturnValue(queryRunner)
        mockReadUserByEmail.mockResolvedValue({
            id: 'user-1',
            email: 'victim@example.com',
            status: UserStatus.ACTIVE,
            ssoProvider: 'Google SSO',
            ssoSubjectId: 'google-sub-1'
        })

        const sso = new TestSSO({} as any)
        const done = jest.fn()

        await sso.verifyAndLogin({} as any, 'victim@example.com', done, { id: 'auth0-sub-999', displayName: 'Attacker' } as any, 'at', 'rt')

        expect(mockBindSSOIdentity).not.toHaveBeenCalled()
        expect(mockRecordLoginActivity).toHaveBeenCalled()
        expect(done).toHaveBeenCalledWith({ name: 'SSO_LOGIN_FAILED', message: UserErrorMessage.SSO_IDENTITY_MISMATCH }, undefined)
        expect(queryRunner.release).toHaveBeenCalled()
    })

    it('rejects a login when the provider does not supply a stable subject id', async () => {
        const queryRunner = makeQueryRunner()
        mockCreateQueryRunner.mockReturnValue(queryRunner)
        mockReadUserByEmail.mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            status: UserStatus.ACTIVE,
            ssoProvider: null,
            ssoSubjectId: null
        })

        const sso = new TestSSO({} as any)
        const done = jest.fn()

        await sso.verifyAndLogin({} as any, 'user@example.com', done, { displayName: 'No Subject' } as any, 'at', 'rt')

        expect(mockBindSSOIdentity).not.toHaveBeenCalled()
        expect(done).toHaveBeenCalledWith({ name: 'SSO_LOGIN_FAILED', message: UserErrorMessage.SSO_SUBJECT_ID_MISSING }, undefined)
    })
})
