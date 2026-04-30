import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { Request } from 'express'
import { StatusCodes } from 'http-status-codes'
import { QueryRunner } from 'typeorm'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { GeneralErrorMessage } from '../../utils/constants'
import { Workspace } from '../database/entities/workspace.entity'
import { LoggedInUser } from '../Interface.Enterprise'

const mockReadOrganizationUserByOrganizationIdUserId = jest.fn() as jest.MockedFunction<
    (organizationId: string, userId: string, queryRunner: QueryRunner) => Promise<{ organizationUser: unknown }>
>

jest.mock('../services/organization-user.service', () => ({
    OrganizationUserService: jest.fn().mockImplementation(() => ({
        readOrganizationUserByOrganizationIdUserId: mockReadOrganizationUserByOrganizationIdUserId
    }))
}))

import {
    assertMayReadTargetUser,
    assertQueryOrganizationMatchesActiveOrg,
    assertWorkspaceIdAccessibleToUser,
    getActiveWorkspaceIdForRequest,
    getLoggedInUser,
    userMayManageOrgUsers
} from './tenantRequestGuards'

function makeLoggedInUser(overrides: Partial<LoggedInUser> = {}): LoggedInUser {
    return {
        id: 'user-1',
        email: 'a@example.com',
        name: 'Test User',
        roleId: 'role-1',
        activeOrganizationId: 'org-1',
        activeOrganizationSubscriptionId: 'sub-1',
        activeOrganizationCustomerId: 'cus-1',
        activeOrganizationProductId: 'prod-1',
        isOrganizationAdmin: false,
        activeWorkspaceId: 'ws-active',
        activeWorkspace: 'Active WS',
        assignedWorkspaces: [],
        permissions: [],
        ...overrides
    }
}

function makeRequest(user: Partial<LoggedInUser> | undefined): Request {
    return { user } as unknown as Request
}

function makeQueryRunner(findOneByImpl?: jest.MockedFunction<(entity: unknown, where: { id: string }) => Promise<unknown>>): QueryRunner {
    const findOneBy = findOneByImpl ?? jest.fn()
    return {
        manager: { findOneBy }
    } as unknown as QueryRunner
}

describe('tenantRequestGuards', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('getLoggedInUser', () => {
        it('throws UNAUTHORIZED when req.user is missing', () => {
            expect(() => getLoggedInUser(makeRequest(undefined))).toThrow(InternalFlowiseError)
            try {
                getLoggedInUser(makeRequest(undefined))
            } catch (e) {
                expect((e as InternalFlowiseError).statusCode).toBe(StatusCodes.UNAUTHORIZED)
                expect((e as InternalFlowiseError).message).toBe(GeneralErrorMessage.UNAUTHORIZED)
            }
        })

        it('throws when id, activeOrganizationId, or activeWorkspaceId is missing', () => {
            expect(() => getLoggedInUser(makeRequest({ ...makeLoggedInUser(), id: '' }))).toThrow(InternalFlowiseError)
            expect(() => getLoggedInUser(makeRequest({ ...makeLoggedInUser(), activeOrganizationId: '' }))).toThrow(InternalFlowiseError)
            expect(() => getLoggedInUser(makeRequest({ ...makeLoggedInUser(), activeWorkspaceId: '' }))).toThrow(InternalFlowiseError)
        })

        it('returns user when session fields are present', () => {
            const user = makeLoggedInUser()
            expect(getLoggedInUser(makeRequest(user))).toBe(user)
        })
    })

    describe('getActiveWorkspaceIdForRequest', () => {
        it('returns activeWorkspaceId for interactive session (user has id)', () => {
            const user = makeLoggedInUser({ activeWorkspaceId: 'ws-int' })
            expect(getActiveWorkspaceIdForRequest(makeRequest(user))).toBe('ws-int')
        })

        it('throws when user has id but session is incomplete', () => {
            expect(() =>
                getActiveWorkspaceIdForRequest(
                    makeRequest({ id: 'u1', activeOrganizationId: 'org-1', activeWorkspaceId: '' } as Partial<LoggedInUser>)
                )
            ).toThrow(InternalFlowiseError)
        })

        it('returns workspace id for API-key-style user without id', () => {
            expect(
                getActiveWorkspaceIdForRequest(
                    makeRequest({
                        activeWorkspaceId: 'ws-api',
                        activeOrganizationId: 'org-1'
                    } as Partial<LoggedInUser>)
                )
            ).toBe('ws-api')
        })

        it('throws UNAUTHORIZED when no id and workspace or org is missing', () => {
            expect(() =>
                getActiveWorkspaceIdForRequest(
                    makeRequest({
                        activeWorkspaceId: 'ws-api',
                        activeOrganizationId: undefined
                    } as Partial<LoggedInUser>)
                )
            ).toThrow(InternalFlowiseError)

            expect(() =>
                getActiveWorkspaceIdForRequest(
                    makeRequest({
                        activeWorkspaceId: undefined,
                        activeOrganizationId: 'org-1'
                    } as Partial<LoggedInUser>)
                )
            ).toThrow(InternalFlowiseError)
        })
    })

    describe('assertQueryOrganizationMatchesActiveOrg', () => {
        const user = makeLoggedInUser({ activeOrganizationId: 'org-1' })

        it('no-ops when organizationId is undefined or empty', () => {
            expect(() => assertQueryOrganizationMatchesActiveOrg(user, undefined)).not.toThrow()
            expect(() => assertQueryOrganizationMatchesActiveOrg(user, '')).not.toThrow()
        })

        it('no-ops when organizationId matches active org', () => {
            expect(() => assertQueryOrganizationMatchesActiveOrg(user, 'org-1')).not.toThrow()
        })

        it('throws FORBIDDEN when organizationId does not match', () => {
            expect(() => assertQueryOrganizationMatchesActiveOrg(user, 'other-org')).toThrow(InternalFlowiseError)
            try {
                assertQueryOrganizationMatchesActiveOrg(user, 'other-org')
            } catch (e) {
                expect((e as InternalFlowiseError).statusCode).toBe(StatusCodes.FORBIDDEN)
                expect((e as InternalFlowiseError).message).toBe(GeneralErrorMessage.FORBIDDEN)
            }
        })
    })

    describe('assertWorkspaceIdAccessibleToUser', () => {
        it('resolves when workspaceId is undefined or empty', async () => {
            const qr = makeQueryRunner()
            await expect(assertWorkspaceIdAccessibleToUser(makeLoggedInUser(), undefined, qr)).resolves.toBeUndefined()
            await expect(assertWorkspaceIdAccessibleToUser(makeLoggedInUser(), '', qr)).resolves.toBeUndefined()
        })

        it('resolves when workspace is the active workspace', async () => {
            const user = makeLoggedInUser({ activeWorkspaceId: 'ws-1' })
            await expect(assertWorkspaceIdAccessibleToUser(user, 'ws-1', makeQueryRunner())).resolves.toBeUndefined()
        })

        it('resolves when workspace is in assignedWorkspaces', async () => {
            const user = makeLoggedInUser({
                activeWorkspaceId: 'ws-active',
                assignedWorkspaces: [{ id: 'ws-other', name: 'Other', role: 'member', organizationId: 'org-1' }]
            })
            await expect(assertWorkspaceIdAccessibleToUser(user, 'ws-other', makeQueryRunner())).resolves.toBeUndefined()
        })

        it('throws FORBIDDEN when user cannot access workspace', async () => {
            const user = makeLoggedInUser({
                activeWorkspaceId: 'ws-active',
                isOrganizationAdmin: false,
                assignedWorkspaces: []
            })
            await expect(assertWorkspaceIdAccessibleToUser(user, 'ws-remote', makeQueryRunner())).rejects.toThrow(InternalFlowiseError)
        })

        it('org admin: resolves when workspace belongs to active organization', async () => {
            const findOneBy = jest
                .fn<(entity: unknown, where: { id: string }) => Promise<unknown>>()
                .mockResolvedValue({ id: 'ws-remote', organizationId: 'org-1' })
            const user = makeLoggedInUser({
                activeWorkspaceId: 'ws-active',
                activeOrganizationId: 'org-1',
                isOrganizationAdmin: true,
                assignedWorkspaces: []
            })
            await assertWorkspaceIdAccessibleToUser(user, 'ws-remote', makeQueryRunner(findOneBy))
            expect(findOneBy).toHaveBeenCalledWith(Workspace, { id: 'ws-remote' })
        })

        it('org admin: throws when workspace is not found', async () => {
            const findOneBy = jest.fn<(entity: unknown, where: { id: string }) => Promise<unknown>>().mockResolvedValue(null)
            const user = makeLoggedInUser({ isOrganizationAdmin: true, activeOrganizationId: 'org-1' })
            await expect(assertWorkspaceIdAccessibleToUser(user, 'missing-ws', makeQueryRunner(findOneBy))).rejects.toMatchObject({
                statusCode: StatusCodes.FORBIDDEN,
                message: GeneralErrorMessage.FORBIDDEN
            })
        })

        it('org admin: throws when workspace is in another organization', async () => {
            const findOneBy = jest
                .fn<(entity: unknown, where: { id: string }) => Promise<unknown>>()
                .mockResolvedValue({ id: 'ws-remote', organizationId: 'org-other' })
            const user = makeLoggedInUser({ isOrganizationAdmin: true, activeOrganizationId: 'org-1' })
            await expect(assertWorkspaceIdAccessibleToUser(user, 'ws-remote', makeQueryRunner(findOneBy))).rejects.toMatchObject({
                statusCode: StatusCodes.FORBIDDEN
            })
        })
    })

    describe('userMayManageOrgUsers', () => {
        it('returns true for organization admin', () => {
            expect(userMayManageOrgUsers(makeLoggedInUser({ isOrganizationAdmin: true }))).toBe(true)
        })

        it('returns true when permissions include users:manage', () => {
            expect(
                userMayManageOrgUsers(makeLoggedInUser({ isOrganizationAdmin: false, permissions: ['users:manage', 'other:perm'] }))
            ).toBe(true)
        })

        it('returns false without admin or users:manage', () => {
            expect(userMayManageOrgUsers(makeLoggedInUser({ isOrganizationAdmin: false, permissions: ['other:perm'] }))).toBe(false)
            expect(userMayManageOrgUsers(makeLoggedInUser({ isOrganizationAdmin: false, permissions: [] }))).toBe(false)
            expect(userMayManageOrgUsers(makeLoggedInUser({ isOrganizationAdmin: false }))).toBe(false)
        })
    })

    describe('assertMayReadTargetUser', () => {
        const qr = makeQueryRunner()

        it('resolves when reading own profile', async () => {
            const user = makeLoggedInUser({ id: 'user-1' })
            await expect(assertMayReadTargetUser(user, 'user-1', qr)).resolves.toBeUndefined()
            expect(mockReadOrganizationUserByOrganizationIdUserId).not.toHaveBeenCalled()
        })

        it('allows API-key caller without id to read another user when manager and org membership exists', async () => {
            const user = makeLoggedInUser({
                id: undefined as unknown as string,
                isOrganizationAdmin: false,
                permissions: ['users:manage']
            })
            mockReadOrganizationUserByOrganizationIdUserId.mockResolvedValue({ organizationUser: { id: 'ou-1' } })
            await expect(assertMayReadTargetUser(user, 'user-target', qr)).resolves.toBeUndefined()
            expect(mockReadOrganizationUserByOrganizationIdUserId).toHaveBeenCalledWith('org-1', 'user-target', qr)
        })

        it('throws FORBIDDEN when activeOrganizationId is missing', async () => {
            const user = makeLoggedInUser({ activeOrganizationId: '' })
            await expect(assertMayReadTargetUser(user, 'other', qr)).rejects.toMatchObject({
                statusCode: StatusCodes.FORBIDDEN
            })
            expect(mockReadOrganizationUserByOrganizationIdUserId).not.toHaveBeenCalled()
        })

        it('throws FORBIDDEN when caller cannot manage org users', async () => {
            const user = makeLoggedInUser({ id: 'user-1', isOrganizationAdmin: false, permissions: [] })
            await expect(assertMayReadTargetUser(user, 'user-2', qr)).rejects.toMatchObject({
                statusCode: StatusCodes.FORBIDDEN
            })
            expect(mockReadOrganizationUserByOrganizationIdUserId).not.toHaveBeenCalled()
        })

        it('throws FORBIDDEN when target is not in organization', async () => {
            const user = makeLoggedInUser({ isOrganizationAdmin: true })
            mockReadOrganizationUserByOrganizationIdUserId.mockResolvedValue({ organizationUser: null })
            await expect(assertMayReadTargetUser(user, 'stranger', qr)).rejects.toMatchObject({
                statusCode: StatusCodes.FORBIDDEN
            })
        })

        it('resolves when manager and organizationUser exists', async () => {
            const user = makeLoggedInUser({ isOrganizationAdmin: true })
            mockReadOrganizationUserByOrganizationIdUserId.mockResolvedValue({ organizationUser: { id: 'ou-1' } })
            await expect(assertMayReadTargetUser(user, 'user-2', qr)).resolves.toBeUndefined()
        })
    })
})
