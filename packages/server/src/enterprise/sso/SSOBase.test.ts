import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { QueryRunner } from 'typeorm'
import { Platform } from '../../Interface'
import { UserStatus } from '../database/entities/user.entity'
import { UserErrorMessage } from '../services/user.service'

const mockReadUserByEmail = jest.fn() as jest.MockedFunction<(_email: string, _queryRunner: QueryRunner) => Promise<any>>
const mockCreateQueryRunner = jest.fn() as jest.MockedFunction<() => any>
const mockGetPlatformType = jest.fn() as jest.MockedFunction<() => Platform>

jest.mock('../../utils/getRunningExpressApp', () => ({
    getRunningExpressApp: jest.fn().mockImplementation(() => ({
        AppDataSource: { createQueryRunner: mockCreateQueryRunner },
        identityManager: { getPlatformType: mockGetPlatformType }
    }))
}))

jest.mock('../services/user.service', () => ({
    UserService: jest.fn().mockImplementation(() => ({ readUserByEmail: mockReadUserByEmail }))
}))

jest.mock('../services/organization.service', () => ({
    OrganizationService: jest.fn().mockImplementation(() => ({}))
}))

jest.mock('../services/workspace-user.service', () => ({
    WorkspaceUserService: jest.fn().mockImplementation(() => ({}))
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

describe('SSOBase.verifyAndLogin', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('rejects an INVITED user instead of auto-activating them (invite-token bypass fix)', async () => {
        const queryRunner = makeQueryRunner()
        mockCreateQueryRunner.mockReturnValue(queryRunner)
        mockGetPlatformType.mockReturnValue(Platform.ENTERPRISE)
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
})
