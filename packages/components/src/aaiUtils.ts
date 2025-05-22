import { ICommonObject } from './Interface'

/**
 * Generates a secure, consistent namespace for AAI components
 * Used by AAIVectorStore and AAIRecordManager to ensure namespaces match
 * @param options The options object containing chatflowid and user information
 * @param namespace Optional custom namespace
 * @returns A formatted namespace string
 */
export function generateSecureNamespace(options: ICommonObject, baseNamespace: string = 'default'): string {
    const chatflowPrefix = `chatflow:${options.chatflowid}_`
    let orgPrefix = options.user?.organizationId ? `org:${options.user.organizationId}_` : ''
    if (options.organizationId) {
        orgPrefix = `org:${options.organizationId}_`
    }
    const namespace = `${orgPrefix}${chatflowPrefix}${baseNamespace}`
    return namespace
}
