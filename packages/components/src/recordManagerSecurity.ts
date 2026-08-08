export const RECORD_MANAGER_TABLE_NAME_MAX_LENGTH = 128
export const RECORD_MANAGER_NAMESPACE_MAX_LENGTH = 128

/**
 * Validates record manager table names used in SQL identifiers.
 */
export function sanitizeRecordManagerTableName(tableName: string): string {
    tableName = tableName.trim().toLowerCase().replace(/\s+/g, '_')

    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
        throw new Error('Invalid table name')
    }

    if (tableName.length > RECORD_MANAGER_TABLE_NAME_MAX_LENGTH) {
        throw new Error(`Invalid table name: must be at most ${RECORD_MANAGER_TABLE_NAME_MAX_LENGTH} characters`)
    }

    return tableName
}

/**
 * Validates record manager namespace values stored in the database.
 */
export function sanitizeRecordManagerNamespace(namespace: string): string {
    const trimmed = namespace.trim()

    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(trimmed)) {
        throw new Error('Invalid namespace')
    }

    if (trimmed.length > RECORD_MANAGER_NAMESPACE_MAX_LENGTH) {
        throw new Error(`Invalid namespace: must be at most ${RECORD_MANAGER_NAMESPACE_MAX_LENGTH} characters`)
    }

    return trimmed
}
