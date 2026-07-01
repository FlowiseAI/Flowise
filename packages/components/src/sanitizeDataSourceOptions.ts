import { ICommonObject } from './Interface'

/** TypeORM DataSource options that can load and execute arbitrary local JavaScript files. */
const BLOCKED_DATASOURCE_KEYS = ['entities', 'subscribers', 'migrations', 'extra'] as const

/** Connection options that must be set by the node, not via additionalConfig. */
const RESERVED_CONNECTION_KEYS = ['database', 'type', 'url', 'host', 'port', 'username', 'password'] as const

export type BlockedDataSourceKey = (typeof BLOCKED_DATASOURCE_KEYS)[number]
export type ReservedConnectionKey = (typeof RESERVED_CONNECTION_KEYS)[number]

/**
 * Rejects user-supplied TypeORM DataSource options that can lead to arbitrary code execution
 * when passed to `new DataSource(options).initialize()`.
 */
export function sanitizeDataSourceOptions(config: ICommonObject): ICommonObject {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        return {}
    }

    for (const key of BLOCKED_DATASOURCE_KEYS) {
        if (key in config) {
            throw new Error(`Disallowed TypeORM DataSource option: ${key}`)
        }
    }

    return { ...config }
}

/**
 * Rejects user-supplied connection fields that must not override node-controlled settings.
 */
export function rejectReservedDataSourceKeys(config: ICommonObject): void {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        return
    }

    for (const key of RESERVED_CONNECTION_KEYS) {
        if (key in config) {
            throw new Error(`Disallowed TypeORM DataSource option: ${key}`)
        }
    }
}

/**
 * Merges sanitized user options under protected node-controlled DataSource options.
 */
export function mergeDataSourceOptions<T extends ICommonObject>(protectedOptions: T, userOptions: ICommonObject): T {
    const sanitized = sanitizeDataSourceOptions(userOptions)
    rejectReservedDataSourceKeys(sanitized)
    return { ...sanitized, ...protectedOptions }
}
