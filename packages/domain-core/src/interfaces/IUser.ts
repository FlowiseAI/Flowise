/**
 * User Interface
 * Represents a user in the system with permissions and workspace information
 */
export interface IUser {
    /** Unique user identifier */
    id: string

    /** User email address */
    email: string

    /** User permissions (e.g., 'agentflows:create', 'agentflows:execute') */
    permissions: string[]

    /** Active workspace/organization ID */
    activeWorkspaceId: string

    /** Optional: Active workspace name */
    activeWorkspace?: string

    /** Optional: Active organization ID */
    activeOrganizationId?: string

    /** Optional: Is user an organization admin */
    isOrganizationAdmin?: boolean

    /** Optional: User display name */
    username?: string

    /** Optional: Additional features enabled for user */
    features?: string[]
}
