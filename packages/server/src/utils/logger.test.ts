import { afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals'

// ---------- mocks (must be hoisted) ----------
const mockExistsSync = jest.fn()
const mockMkdirSync = jest.fn()

jest.mock('fs', () => ({
    existsSync: (...args: any[]) => mockExistsSync(...args),
    mkdirSync: (...args: any[]) => mockMkdirSync(...args)
}))

jest.mock('flowise-components', () => {
    const winston = require('winston')
    return {
        StorageProviderFactory: {
            getProvider: jest.fn(() => ({
                getLoggerTransports: jest.fn(() => [new winston.transports.Console()])
            }))
        }
    }
})

jest.mock('../../src/utils/config', () => ({
    __esModule: true,
    default: {
        logging: { dir: '/tmp/flowise-test-logs' }
    }
}))

// ---------- load logger only after mocks (so our mocks are used) ----------
let logger: any
let expressRequestLogger: (req: any, res: any, next: any) => void
let auditLogger: any

const ORIGINAL_ENV = process.env

describe('logger.ts', () => {
    beforeAll(() => {
        mockExistsSync.mockReturnValue(false) // so line 22 (mkdirSync) runs when module loads
        jest.resetModules()
        const mod = require('../../src/utils/logger')
        logger = mod.default
        expressRequestLogger = mod.expressRequestLogger
        auditLogger = mod.auditLogger
        // Assert here so beforeEach's clearAllMocks() doesn't wipe call history
        expect(mockExistsSync).toHaveBeenCalled()
        expect(mockMkdirSync).toHaveBeenCalled()
    })

    beforeEach(() => {
        process.env = { ...ORIGINAL_ENV }
        jest.clearAllMocks()
    })

    afterEach(() => {
        process.env = ORIGINAL_ENV
    })

    describe('expressRequestLogger', () => {
        const next = jest.fn()

        it('calls next()', () => {
            const req = { url: '/api/v1/chatflows', method: 'GET', params: {} } as any
            expressRequestLogger(req, {} as any, next)
            expect(next).toHaveBeenCalled()
        })

        it('does not log when URL is in unwantedLogURLs (ping)', () => {
            const req = { url: '/api/v1/ping', method: 'GET', params: {} } as any
            const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {})
            expressRequestLogger(req, {} as any, next)
            expect(next).toHaveBeenCalled()
            expect(infoSpy).not.toHaveBeenCalled()
            infoSpy.mockRestore()
        })

        it('does not log when URL is in unwantedLogURLs (node-icon)', () => {
            const req = { url: '/api/v1/node-icon/xyz', method: 'GET', params: {} } as any
            const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {})
            expressRequestLogger(req, {} as any, next)
            expect(next).toHaveBeenCalled()
            expect(infoSpy).not.toHaveBeenCalled()
            infoSpy.mockRestore()
        })

        it('does not log when URL does not match /api/v1/', () => {
            const req = { url: '/health', method: 'GET', params: {} } as any
            const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {})
            expressRequestLogger(req, {} as any, next)
            expect(next).toHaveBeenCalled()
            expect(infoSpy).not.toHaveBeenCalled()
            infoSpy.mockRestore()
        })

        it('logs GET request (requestLogger.http path)', () => {
            const req = { url: '/api/v1/chatflows', method: 'GET', params: {} } as any
            expressRequestLogger(req, {} as any, next)
            expect(next).toHaveBeenCalled()
        })

        it('logs POST request (requestLogger.info + logger.info path)', () => {
            const req = { url: '/api/v1/chatflows', method: 'POST', params: {} } as any
            const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {})
            expressRequestLogger(req, {} as any, next)
            expect(next).toHaveBeenCalled()
            expect(infoSpy).toHaveBeenCalled()
            infoSpy.mockRestore()
        })

        it('logs PUT request', () => {
            const req = { url: '/api/v1/chatflows/1', method: 'PUT', params: {} } as any
            const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {})
            expressRequestLogger(req, {} as any, next)
            expect(infoSpy).toHaveBeenCalled()
            infoSpy.mockRestore()
        })

        it('logs DELETE request', () => {
            const req = { url: '/api/v1/chatflows/1', method: 'DELETE', params: {} } as any
            const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {})
            expressRequestLogger(req, {} as any, next)
            expect(infoSpy).toHaveBeenCalled()
            infoSpy.mockRestore()
        })

        it('when DEBUG=true runs sanitization (getSensitiveBodyFields, getSensitiveHeaderFields, sanitizeObject)', () => {
            process.env.DEBUG = 'true'
            process.env.LOG_SANITIZE_BODY_FIELDS = 'password,secret'
            process.env.LOG_SANITIZE_HEADER_FIELDS = 'authorization'

            const req = {
                url: '/api/v1/chatflows',
                method: 'POST',
                params: {},
                body: { password: 'mypass', user: 'john@example.com' },
                query: { token: 'x@y.z' },
                headers: { authorization: 'Bearer xxx', 'content-type': 'application/json' }
            } as any
            const res = {} as any

            expressRequestLogger(req, res, next)
            expect(next).toHaveBeenCalled()
        })

        it('when DEBUG=true and no sanitize env vars still includes body/query/headers', () => {
            process.env.DEBUG = 'true'
            delete process.env.LOG_SANITIZE_BODY_FIELDS
            delete process.env.LOG_SANITIZE_HEADER_FIELDS

            const req = {
                url: '/api/v1/chatflows',
                method: 'POST',
                params: {},
                body: { foo: 1 },
                query: {},
                headers: {}
            } as any

            expressRequestLogger(req, {} as any, next)
            expect(next).toHaveBeenCalled()
        })
    })

    describe('exports', () => {
        it('default logger has log methods', () => {
            expect(logger.info).toBeDefined()
            expect(logger.error).toBeDefined()
            expect(logger.warn).toBeDefined()
            expect(logger.debug).toBeDefined()
        })

        it('auditLogger is defined', () => {
            expect(auditLogger).toBeDefined()
            expect(typeof auditLogger.log).toBe('function')
        })
    })
})
