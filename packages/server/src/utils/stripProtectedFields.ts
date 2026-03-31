/**
 * Fields that are managed exclusively by the server and must never be
 * overwritten by user-supplied request bodies.
 */
export const PROTECTED_FIELDS = ['id', 'createdDate', 'updatedDate', 'workspaceId', 'organizationId'] as const

export type ProtectedField = (typeof PROTECTED_FIELDS)[number]

/**
 * Returns a shallow copy of `body` with all server-managed fields removed.
 * Use this before assigning a request body to a database entity to prevent
 * mass assignment of fields such as `workspaceId`, `id`, and timestamps.
 *
 * @example
 * Object.assign(entity, stripProtectedFields(req.body))
 */
export function stripProtectedFields<T extends Record<string, unknown>>(body: T): Omit<T, ProtectedField> {
    const sanitized = { ...body }
    for (const field of PROTECTED_FIELDS) {
        delete sanitized[field]
    }
    return sanitized as Omit<T, ProtectedField>
}
