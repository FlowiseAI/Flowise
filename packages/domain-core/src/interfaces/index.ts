/**
 * Shared Interfaces
 *
 * Framework-agnostic interfaces that define contracts between
 * the legacy codebase and domain-driven implementations.
 */

// ============================================
// CORE INTERFACES
// ============================================

export * from './IUser'
export * from './IAuthService'
export * from './IFlowRepository'
export * from './ICredentialStore'
export * from './ITokenService'

// ============================================
// LEGACY INTERFACES (kept for backward compatibility)
// ============================================

/**
 * @deprecated Use IFlowRepository instead
 * Legacy Flow Repository Interface
 */
export interface ILegacyFlowRepository {
    saveFlow(flowId: string, flowData: unknown): Promise<void>
    getFlow(flowId: string): Promise<unknown | undefined>
    listFlows(): Promise<
        Array<{
            id: string
            name: string
            [key: string]: unknown
        }>
    >
    deleteFlow(flowId: string): Promise<void>
}

/**
 * @deprecated Use IAuthService instead
 * Authentication Provider Interface - Legacy interface for backward compatibility
 */
export interface IAuthProvider {
    initialize(): Promise<void>
    authenticate(credentials: unknown): Promise<{
        user: unknown
        token?: string
    }>
    verifyToken(token: string): Promise<unknown | null>
}

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

