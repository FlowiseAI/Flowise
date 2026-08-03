import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'

// ---------- mocks (must be hoisted) ----------
jest.mock('geoip-lite', () => ({ lookup: jest.fn() }))
jest.mock('uuid', () => ({ v4: jest.fn() }))
jest.mock('posthog-node', () => ({ PostHog: jest.fn() }))

jest.mock('../../src/utils', () => ({
    getAppVersion: jest.fn()
}))

jest.mock('../../src/utils/ipValidation', () => ({
    isIPv4: jest.fn(),
    isIPv6: jest.fn(),
    isValidIPAddress: jest.fn()
}))

jest.mock('../../src/utils/logger', () => ({
    __esModule: true,
    default: {
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    },
    auditLogger: {
        log: jest.fn()
    }
}))

// ---------- imports under test ----------
import { emitEvent, Telemetry, TelemetryEventCategory, TelemetryEventResult } from '../../src/utils/telemetry'

const geoip = require('geoip-lite')
const uuid = require('uuid')
const posthogNode = require('posthog-node')
const utils = require('../../src/utils')
const ipValidation = require('../../src/utils/ipValidation')
const loggerModule = require('../../src/utils/logger')

const ORIGINAL_ENV = process.env

describe('utils/telemetry.ts', () => {
    beforeEach(() => {
        process.env = { ...ORIGINAL_ENV }
        jest.clearAllMocks()

        jest.useFakeTimers()
        jest.setSystemTime(new Date('2026-03-16T12:34:56.000Z'))

        uuid.v4.mockReturnValue('test-uuid-1')
        utils.getAppVersion.mockResolvedValue('3.0.13')

        ipValidation.isValidIPAddress.mockReturnValue(true)
        ipValidation.isIPv4.mockReturnValue(true)
        ipValidation.isIPv6.mockReturnValue(false)
        geoip.lookup.mockReturnValue({ country: 'US', region: 'CA' })
    })

    afterEach(() => {
        jest.useRealTimers()
        process.env = ORIGINAL_ENV
    })

    describe('Telemetry (PostHog) class', () => {
        it('does not create PostHog when POSTHOG_PUBLIC_API_KEY is unset', async () => {
            delete process.env.POSTHOG_PUBLIC_API_KEY
            const t = new Telemetry()
            expect(t.postHog).toBeUndefined()
            expect(posthogNode.PostHog).not.toHaveBeenCalled()
        })

        it('creates PostHog when POSTHOG_PUBLIC_API_KEY is set and captures', async () => {
            process.env.POSTHOG_PUBLIC_API_KEY = 'ph-key'

            const capture = jest.fn()
            const shutdownAsync = jest.fn()
            posthogNode.PostHog.mockImplementation(() => ({ capture, shutdownAsync }))

            const t = new Telemetry()
            expect(posthogNode.PostHog).toHaveBeenCalledWith('ph-key')

            await t.sendTelemetry('evt', { hello: 'world' }, 'org-1')

            expect(utils.getAppVersion).toHaveBeenCalled()
            expect(capture).toHaveBeenCalledWith({
                event: 'evt',
                distinctId: 'org-1',
                properties: { hello: 'world', version: '3.0.13' }
            })

            await t.flush()
            expect(shutdownAsync).toHaveBeenCalled()
        })

        it('sendTelemetry: uses default args and uuid distinctId when orgId omitted', async () => {
            process.env.POSTHOG_PUBLIC_API_KEY = 'ph-key'

            uuid.v4.mockReturnValue('distinct-uuid-777')

            const capture = jest.fn()
            const shutdownAsync = jest.fn()
            posthogNode.PostHog.mockImplementation(() => ({ capture, shutdownAsync }))

            const t = new Telemetry()

            // omit both properties and orgId to hit defaults on line 25
            await t.sendTelemetry('evt-default-args')

            expect(capture).toHaveBeenCalledTimes(1)
            expect(capture).toHaveBeenCalledWith({
                event: 'evt-default-args',
                distinctId: 'distinct-uuid-777', // hits orgId || uuidv4() branch on line 28
                properties: { version: '3.0.13' }
            })
        })
    })

    describe('emitEvent()', () => {
        it('logs an enriched + sanitized event', async () => {
            await emitEvent({
                category: TelemetryEventCategory.SECURITY,
                eventType: 'password-reset-requested',
                actionType: 'update',
                userId: 'user-123',
                orgId: 'org-456',
                resourceId: 'res-789',
                ipAddress: '203.0.113.42',
                result: TelemetryEventResult.SUCCESS,
                metadata: { tokenExpiryMinutes: 15 }
            })

            expect(loggerModule.auditLogger.log).toHaveBeenCalledTimes(1)

            const payload = loggerModule.auditLogger.log.mock.calls[0][0]
            expect(payload).toEqual(
                expect.objectContaining({
                    level: 'info',
                    message: 'password-reset-requested',
                    eventId: 'test-uuid-1',
                    timestamp: '2026-03-16T12:34:56.000Z',
                    version: '3.0.13',
                    category: 'security',
                    eventType: 'password-reset-requested',
                    actionType: 'update',
                    userId: 'user-123',
                    orgId: 'org-456',
                    resourceId: 'res-789',
                    ipAddress: '203.0.113.xxx',
                    countryCode: 'US',
                    region: 'CA',
                    result: 'success',
                    metadata: { tokenExpiryMinutes: '********' }
                })
            )
        })

        it('invalid IP skips geo enrichment and masks to "unknown"', async () => {
            ipValidation.isValidIPAddress.mockReturnValue(false)

            await emitEvent({
                category: TelemetryEventCategory.AUDIT,
                eventType: 'bad-ip',
                actionType: 'create',
                userId: 'u',
                orgId: 'o',
                ipAddress: 'not-an-ip',
                result: TelemetryEventResult.SUCCESS
            })

            expect(geoip.lookup).not.toHaveBeenCalled()

            const payload = loggerModule.auditLogger.log.mock.calls[0][0]
            expect(payload.ipAddress).toBe('unknown')
            expect(payload.countryCode).toBeUndefined()
            expect(payload.region).toBeUndefined()
        })

        it('geoip lookup returning null yields no country/region', async () => {
            geoip.lookup.mockReturnValue(null)

            await emitEvent({
                category: TelemetryEventCategory.AUDIT,
                eventType: 'geo-null',
                actionType: 'read',
                userId: 'u',
                orgId: 'o',
                ipAddress: '198.51.100.10',
                result: TelemetryEventResult.SUCCESS
            })

            const payload = loggerModule.auditLogger.log.mock.calls[0][0]
            expect(payload.countryCode).toBeUndefined()
            expect(payload.region).toBeUndefined()
        })

        it('geoip lookup throw is swallowed and still logs event', async () => {
            geoip.lookup.mockImplementation(() => {
                throw new Error('geo fail')
            })

            await emitEvent({
                category: TelemetryEventCategory.AUDIT,
                eventType: 'geo-throws',
                actionType: 'read',
                userId: 'u',
                orgId: 'o',
                ipAddress: '198.51.100.10',
                result: TelemetryEventResult.SUCCESS
            })

            expect(loggerModule.default.error).toHaveBeenCalled() // logs geo error
            expect(loggerModule.auditLogger.log).toHaveBeenCalledTimes(1)
        })

        it('auditLogger.log throwing is swallowed (no throw)', async () => {
            loggerModule.auditLogger.log.mockImplementationOnce(() => {
                throw new Error('sink fail')
            })

            await expect(
                emitEvent({
                    category: TelemetryEventCategory.SYSTEM,
                    eventType: 'sink-fails',
                    actionType: 'execute',
                    userId: 'u',
                    orgId: 'o',
                    result: TelemetryEventResult.SUCCESS
                })
            ).resolves.toBeUndefined()

            expect(loggerModule.default.error).toHaveBeenCalled()
        })

        it('getAppVersion throwing is swallowed (no throw)', async () => {
            utils.getAppVersion.mockRejectedValueOnce(new Error('version fail'))

            await expect(
                emitEvent({
                    category: TelemetryEventCategory.SYSTEM,
                    eventType: 'version-fails',
                    actionType: 'execute',
                    userId: 'u',
                    orgId: 'o',
                    result: TelemetryEventResult.SUCCESS
                })
            ).resolves.toBeUndefined()

            expect(loggerModule.default.error).toHaveBeenCalled()
        })
    })
})
