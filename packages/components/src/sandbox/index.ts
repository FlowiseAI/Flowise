/**
 * Sandbox — public surface.
 *
 * Re-exports the protocol types, the structural type guard, the
 * `BaseSandbox` abstract class that powers Layer 2 of the architecture,
 * and the shipped backend adapters.
 */

export * from './types'
export * from './isSandboxBackend'
export * from './BaseSandbox'
export * from './backends'
export * from './resolveBackend'
