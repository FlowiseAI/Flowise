import { describe, expect, it, beforeEach } from '@jest/globals'
import { Request, Response, NextFunction } from 'express'

// Mock logger before importing the module under test
jest.mock('../../../utils/logger', () => ({
    __esModule: true,
    default: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() }
}))

// Mock getRunningExpressApp
const mockGetRunningExpressApp = jest.fn()
jest.mock('../../../utils/getRunningExpressApp', () => ({
    getRunningExpressApp: () => mockGetRunningExpressApp()
}))

import authController from './index'

describe('auth controller', () => {
    describe('getAllPermissions', () => {
        it('should return 401 when req.user is undefined', async () => {
            const req = {
                params: { type: 'resolve' },
                user: undefined
            } as unknown as Request

            const json = jest.fn()
            const status = jest.fn().mockReturnValue({ json })
            const res = { status } as unknown as Response
            const next = jest.fn() as unknown as NextFunction

            // Mock the running app with identity manager
            mockGetRunningExpressApp.mockReturnValue({
                identityManager: {
                    getPermissions: () => ({ toJSON: () => ({}) }),
                    getPlatformType: () => 'OPEN_SOURCE'
                }
            })

            await authController.getAllPermissions(req, res, next)

            expect(status).toHaveBeenCalledWith(401)
            expect(json).toHaveBeenCalledWith({ error: 'Unauthorized Access' })
            expect(next).not.toHaveBeenCalled()
        })

        it('should return permissions when req.user is present', async () => {
            const req = {
                params: { type: 'ROLE' },
                user: {
                    isOrganizationAdmin: true,
                    permissions: [],
                    features: {}
                }
            } as unknown as Request

            const json = jest.fn()
            const status = jest.fn().mockReturnValue({ json })
            const res = { status } as unknown as Response
            const next = jest.fn() as unknown as NextFunction

            const mockPermissions = {
                chatflows: [{ key: 'chatflows:read', value: 'Read Chatflows' }]
            }

            mockGetRunningExpressApp.mockReturnValue({
                identityManager: {
                    getPermissions: () => ({ toJSON: () => mockPermissions }),
                    getPlatformType: () => 'OPEN_SOURCE'
                }
            })

            await authController.getAllPermissions(req, res, next)

            expect(status).toHaveBeenCalledWith(200)
            expect(json).toHaveBeenCalledWith(mockPermissions)
        })
    })
})
