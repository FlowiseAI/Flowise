import geoip from 'geoip-lite'
import { PostHog } from 'posthog-node'
import { v4 as uuidv4 } from 'uuid'
import { getAppVersion } from '../utils'
import { isValidIPAddress } from './ipValidation'
import logger, { auditLogger } from './logger'
import { sanitizeAuditMetadata, sanitizeIPAddress } from './sanitize.util'

export enum TelemetryEventType {
    'USER_CREATED' = 'user_created',
    'ORGANIZATION_CREATED' = 'organization_created'
}

export class Telemetry {
    postHog?: PostHog

    constructor() {
        if (process.env.POSTHOG_PUBLIC_API_KEY) {
            this.postHog = new PostHog(process.env.POSTHOG_PUBLIC_API_KEY)
        } else {
            this.postHog = undefined
        }
    }

    async sendTelemetry(event: string, properties: Record<string, any> = {}, orgId = ''): Promise<void> {
        properties.version = await getAppVersion()
        if (this.postHog) {
            const distinctId = orgId || uuidv4()
            this.postHog.capture({
                event,
                distinctId,
                properties
            })
        }
    }

    async flush(): Promise<void> {
        if (this.postHog) {
            await this.postHog.shutdownAsync()
        }
    }
}

/**
 * Derives country code and region from an IP address using GeoIP lookup.
 *
 * This function performs a non-blocking geolocation lookup to extract geographic
 * information before the IP address is masked for privacy compliance. Returns
 * ISO country codes and region identifiers that are GDPR/HIPAA compliant.
 *
 * @param ipAddress - The IP address string to geolocate (must be valid IPv4 or IPv6)
 * @returns An object containing optional `countryCode` (ISO 3166-1 alpha-2) and `region` (state/province), or empty object if lookup fails or IP is invalid
 */
function getGeolocation(ipAddress: string): {
    countryCode?: string
    region?: string
} {
    if (!isValidIPAddress(ipAddress)) {
        return {}
    }

    try {
        const geo = geoip.lookup(ipAddress)
        if (!geo) return {}

        return {
            countryCode: geo.country,
            region: geo.region
        }
    } catch (error) {
        logger.error(`Failed to resolve geolocation for IP: ${error}`)
        return {}
    }
}

/**
 * Categories for telemetry events, used for filtering and compliance reporting.
 */
export enum TelemetryEventCategory {
    AUDIT = 'audit', // Compliance and user action tracking (GDPR, HIPAA, ISO 27001)
    METRIC = 'metric', // Performance and usage measurements
    SECURITY = 'security', // Authentication, authorization, access control events
    SYSTEM = 'system' // Operational events (startup, shutdown, errors)
}

/**
 * Result status for telemetry events.
 */
export enum TelemetryEventResult {
    SUCCESS = 'success',
    FAILED = 'failed'
}

export interface TelemetryEventInput {
    category: TelemetryEventCategory
    eventType: string
    actionType: string
    userId: string
    orgId: string
    resourceId?: string
    ipAddress?: string
    result: TelemetryEventResult
    metadata?: Record<string, any>
}
export interface TelemetryEventOutput {
    eventId: string
    timestamp: string
    version: string
    category: TelemetryEventCategory
    eventType: string
    actionType: string
    userId: string
    orgId: string
    resourceId?: string
    ipAddress?: string
    countryCode?: string
    region?: string
    result: TelemetryEventResult
    metadata?: Record<string, any>
}

/**
 * Emits a structured audit/telemetry event to the configured audit log sink.
 *
 * Builds a `TelemetryEventOutput` record and writes it via `auditLogger` (provider-backed transports),
 * enabling storage on local/S3/GCS/Azure depending on `STORAGE_TYPE`.
 *
 * Enrichment & sanitization:
 * - Adds `eventId` (UUID v4), `timestamp` (ISO 8601), and `version` (app version).
 * - If `ipAddress` is provided, attempts GeoIP lookup first to derive `countryCode`/`region`,
 *   then masks the IP via `sanitizeIPAddress` before logging.
 * - Redacts sensitive keys inside `metadata` via `sanitizeAuditMetadata`.
 *
 * Reliability:
 * - Best-effort / non-blocking: failures are caught and logged; this function does not throw.
 *
 * @param input - The event input describing category/action/outcome and optional context.
 * @returns Resolves when the event has been handed off to the logger transport.
 */
export async function emitEvent(input: TelemetryEventInput): Promise<void> {
    try {
        const geo = input.ipAddress ? getGeolocation(input.ipAddress) : {}

        const event: TelemetryEventOutput = {
            eventId: uuidv4(),
            timestamp: new Date().toISOString(),
            version: await getAppVersion(),
            category: input.category,
            eventType: input.eventType,
            actionType: input.actionType,
            userId: input.userId,
            orgId: input.orgId,
            resourceId: input.resourceId,
            ipAddress: input.ipAddress ? sanitizeIPAddress(input.ipAddress) : undefined,
            countryCode: geo.countryCode,
            region: geo.region,
            result: input.result,
            metadata: input.metadata ? sanitizeAuditMetadata(input.metadata) : undefined
        }

        auditLogger.log({ level: 'info', message: event.eventType, ...event })
    } catch (error) {
        logger.error(`Failed to emit event: ${error}`)
    }
}
