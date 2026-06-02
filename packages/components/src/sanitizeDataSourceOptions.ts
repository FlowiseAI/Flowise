import { ICommonObject } from './Interface'

/** TypeORM DataSource options that can load and execute arbitrary local JavaScript files. */
const BLOCKED_DATASOURCE_KEYS = ['entities', 'subscribers', 'migrations', 'extra'] as const

export type BlockedDataSourceKey = (typeof BLOCKED_DATASOURCE_KEYS)[number]

/**
 * Rejects user-supplied TypeORM DataSource options that can lead to arbitrary code execution
 * when passed to `new DataSource(options).initialize()`.
 */
export function sanitizeDataSourceOptions(config: ICommonObject): ICommonObject {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        return {}
    }

    for (const key of BLOCKED_DATASOURCE_KEYS) {
        if (Object.prototype.hasOwnProperty.call(config, key)) {
            throw new Error(`Disallowed TypeORM DataSource option: ${key}`)
        }
    }

    return { ...config }
}
