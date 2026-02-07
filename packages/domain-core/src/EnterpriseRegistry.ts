/**
 * EnterpriseRegistry - Service Locator Pattern
 *
 * Acts as a global switchboard that allows the legacy monolithic codebase
 * to delegate authority to domain-driven implementations. This enables:
 *
 * - Enterprise-specific customizations (Enterprise SSO, Agentflow filtering, JSON persistence)
 * - Clean separation between OSS core and enterprise extensions
 * - Ability to sync with upstream Flowise updates without conflicts
 *
 * Usage:
 * ```typescript
 * import { EnterpriseRegistry } from '@flowise/domain-core'
 *
 * // Register a service
 * EnterpriseRegistry.register('flowRepository', new EnterpriseFlowRepository())
 *
 * // Retrieve a service
 * const flowRepo = EnterpriseRegistry.get('flowRepository')
 * ```
 */

type ServiceKey = string
type ServiceInstance = unknown

/**
 * Static service locator that acts as a global switchboard.
 * This allows legacy code to delegate to domain-driven implementations
 * without creating tight coupling.
 */
export class EnterpriseRegistry {
    private static services: Map<ServiceKey, ServiceInstance> = new Map()
    private static initialized: boolean = false

    /**
     * Initialize the registry with default services.
     * Called once at application startup.
     */
    static initialize(): void {
        if (this.initialized) {
            return
        }
        this.initialized = true
        // Default services can be registered here
    }

    /**
     * Register a service instance with the registry.
     *
     * @param key - Unique identifier for the service
     * @param instance - The service instance to register
     * @throws Error if service is already registered
     */
    static register(key: ServiceKey, instance: ServiceInstance): void {
        if (this.services.has(key)) {
            throw new Error(`Service '${key}' is already registered in EnterpriseRegistry`)
        }
        this.services.set(key, instance)
    }

    /**
     * Register or replace a service instance.
     * Useful for testing or hot-reloading scenarios.
     *
     * @param key - Unique identifier for the service
     * @param instance - The service instance to register
     */
    static registerOrReplace(key: ServiceKey, instance: ServiceInstance): void {
        this.services.set(key, instance)
    }

    /**
     * Retrieve a service instance from the registry.
     *
     * @param key - Unique identifier for the service
     * @returns The service instance, or undefined if not found
     */
    static get<T>(key: ServiceKey): T | undefined {
        return this.services.get(key) as T | undefined
    }

    /**
     * Retrieve a service instance, throwing if not found.
     *
     * @param key - Unique identifier for the service
     * @returns The service instance
     * @throws Error if service is not registered
     */
    static getRequired<T>(key: ServiceKey): T {
        const service = this.services.get(key)
        if (!service) {
            throw new Error(`Service '${key}' is not registered in EnterpriseRegistry`)
        }
        return service as T
    }

    /**
     * Check if a service is registered.
     *
     * @param key - Unique identifier for the service
     * @returns True if the service is registered
     */
    static has(key: ServiceKey): boolean {
        return this.services.has(key)
    }

    /**
     * Unregister a service from the registry.
     *
     * @param key - Unique identifier for the service
     * @returns True if the service was removed, false if it didn't exist
     */
    static unregister(key: ServiceKey): boolean {
        return this.services.delete(key)
    }

    /**
     * Clear all registered services.
     * Useful for testing or cleanup scenarios.
     */
    static clear(): void {
        this.services.clear()
        this.initialized = false
    }

    /**
     * Get all registered service keys.
     *
     * @returns Array of all registered service keys
     */
    static getRegisteredKeys(): ServiceKey[] {
        return Array.from(this.services.keys())
    }
}
