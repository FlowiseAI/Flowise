/**
 * Utility Interfaces
 *
 * Common interfaces for feature management and logging.
 */

/**
 * Feature context for feature flag evaluation
 */
export interface FeatureContext {
    userId?: string
    tenantId?: string
    environment?: string
    [key: string]: unknown
}

/**
 * Feature Management Interface
 * Defines the contract for feature flagging and subsetting.
 */
export interface IFeatureManager {
    isFeatureEnabled(featureName: string, context?: FeatureContext): boolean
    getEnabledFeatures(context?: FeatureContext): string[]
}

/**
 * Log metadata
 */
export interface LogMeta {
    [key: string]: unknown
}

/**
 * Logger Interface
 * Defines the contract for logging across different environments.
 */
export interface ILogger {
    info(message: string, meta?: LogMeta): void
    warn(message: string, meta?: LogMeta): void
    error(message: string, meta?: LogMeta): void
    debug(message: string, meta?: LogMeta): void
}
