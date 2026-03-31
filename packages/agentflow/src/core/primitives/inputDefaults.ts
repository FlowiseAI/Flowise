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
    default: defaultValue,
    options
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
            return 0
        case 'json':
            return '{}'
        case 'array':
            return []
        case 'options': {
            const first = options?.[0]
            if (!first) return ''
            return typeof first === 'string' ? first : first.name
        }
        case 'string':
        case 'password':
        default:
            return ''
    }
}
