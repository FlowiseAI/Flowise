/**
 * Returns the appropriate default value for an input based on its type.
 * If a `default` is provided, it is returned as-is.
 *
 * Accepts a destructured object so it stays decoupled from any domain type
 * (InputParam, CredentialSchemaInput, etc.) while allowing callers to pass
 * those objects directly.
 */
export function getDefaultValueForType({
    type,
    default: defaultValue
}: {
    type: string
    default?: unknown
    options?: Array<{ name: string } | string>
}): unknown {
    if (defaultValue !== undefined) return defaultValue

    switch (type) {
        case 'boolean':
            return false
        case 'number':
            return ''
        case 'json':
            return '{}'
        case 'array':
            return []
        case 'options':
        case 'string':
        case 'password':
        default:
            return ''
    }
}
