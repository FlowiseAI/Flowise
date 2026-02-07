/**
 * Shared Interfaces
 *
 * Framework-agnostic interfaces that define contracts between
 * the legacy codebase and domain-driven implementations.
 *
 * NOTE: These interfaces are NEW abstractions for the domain layer.
 * They do NOT replace existing Flowise interfaces (e.g., IChatFlow in server/src/Interface.ts).
 * Implementations should handle conversion between domain entities and existing Flowise types.
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
// UTILITY INTERFACES
// ============================================

export * from './IUtils'

// ============================================
// LEGACY INTERFACES (backward compatibility)
// ============================================

export * from './ILegacy'
