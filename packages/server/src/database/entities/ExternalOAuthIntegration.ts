import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm'
import { Organization } from '../../enterprise/database/entities/organization.entity'
import { Workspace } from '../../enterprise/database/entities/workspace.entity'

/**
 * Trust configuration for validating JWT access tokens from an external OIDC provider (e.g. Okta).
 * Maps tokens to a fixed org/workspace; scope/claim mapping drives Flowise RBAC.
 */
@Entity('external_oauth_integration')
export class ExternalOAuthIntegration {
    @PrimaryColumn({ type: 'varchar', length: 36 })
    id: string

    @Column({ type: 'varchar', length: 255 })
    name: string

    @Column({ type: 'boolean', default: true })
    enabled: boolean

    /** Must match token `iss` (e.g. https://dev-xxxx.okta.com/oauth2/default) */
    @Column({ type: 'text', name: 'issuerUrl' })
    issuerUrl: string

    /**
     * Acceptable token audiences (token `aud` may be string or string[]).
     * Stored as JSON array string in sqlite.
     */
    @Column({ type: 'simple-json' })
    audiences: string[]

    /** Optional allow-list of OAuth client ids (token azp or cid) */
    @Column({ type: 'simple-json', nullable: true })
    allowedClientIds: string[] | null

    /**
     * Maps IdP scope names (from `scp` / `scope` claim) to Flowise permission strings.
     * Example: { "flowise.chatflows.read": ["chatflows:view"] }
     */
    @Column({ type: 'simple-json' })
    permissionScopeMap: Record<string, string[]>

    /**
     * Claim name for JSON array of Flowise permission strings (optional, merged with scope mapping).
     * Default applied in application code if null.
     */
    @Column({ type: 'varchar', length: 128, nullable: true })
    customPermissionsClaimName: string | null

    @Column({ type: 'varchar', length: 36 })
    organizationId: string

    @ManyToOne(() => Organization)
    @JoinColumn({ name: 'organizationId' })
    organization?: Organization

    @Column({ type: 'varchar', length: 36 })
    workspaceId: string

    @ManyToOne(() => Workspace)
    @JoinColumn({ name: 'workspaceId' })
    workspace?: Workspace

    @CreateDateColumn()
    createdDate: Date

    @UpdateDateColumn()
    updatedDate: Date
}
