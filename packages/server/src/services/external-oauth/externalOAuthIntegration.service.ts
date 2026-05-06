import { DataSource, Repository } from 'typeorm'
import { ExternalOAuthIntegration } from '../../database/entities/ExternalOAuthIntegration'
import { v4 as uuidv4 } from 'uuid'
import { normalizeIssuer } from './issuer'

export const externalOAuthIntegrationService = {
    getRepository(ds: DataSource): Repository<ExternalOAuthIntegration> {
        return ds.getRepository(ExternalOAuthIntegration)
    },

    async findEnabledByIssuerUrl(ds: DataSource, issuerFromToken: string): Promise<ExternalOAuthIntegration[]> {
        const iss = normalizeIssuer(issuerFromToken)
        const repo = this.getRepository(ds)
        // Prefer exact match; stored URLs should match IdP issuer string.
        return repo.find({
            where: { enabled: true, issuerUrl: iss },
            relations: ['workspace', 'organization'],
            order: { updatedDate: 'DESC' }
        })
    },

    async getByIdForOrg(ds: DataSource, id: string, organizationId: string): Promise<ExternalOAuthIntegration | null> {
        return this.getRepository(ds).findOne({ where: { id, organizationId } })
    },

    async listByOrg(ds: DataSource, organizationId: string): Promise<ExternalOAuthIntegration[]> {
        return this.getRepository(ds).find({ where: { organizationId }, order: { name: 'ASC' } })
    },

    async create(
        ds: DataSource,
        body: Pick<
            ExternalOAuthIntegration,
            'name' | 'issuerUrl' | 'audiences' | 'allowedClientIds' | 'permissionScopeMap' | 'organizationId' | 'workspaceId'
        > & { customPermissionsClaimName?: string | null; enabled?: boolean }
    ): Promise<ExternalOAuthIntegration> {
        const entity = new ExternalOAuthIntegration()
        entity.id = uuidv4()
        entity.name = body.name
        entity.enabled = body.enabled !== false
        entity.issuerUrl = normalizeIssuer(body.issuerUrl)
        entity.audiences = [...body.audiences]
        entity.allowedClientIds = body.allowedClientIds?.length ? [...body.allowedClientIds] : null
        entity.permissionScopeMap = body.permissionScopeMap || {}
        entity.customPermissionsClaimName = body.customPermissionsClaimName ?? null
        entity.organizationId = body.organizationId
        entity.workspaceId = body.workspaceId
        await this.getRepository(ds).save(entity)
        return entity
    },

    async update(
        ds: DataSource,
        id: string,
        organizationId: string,
        patch: Partial<
            Pick<ExternalOAuthIntegration, 'name' | 'enabled' | 'issuerUrl' | 'audiences' | 'allowedClientIds' | 'permissionScopeMap'>
        > & { customPermissionsClaimName?: string | null }
    ): Promise<ExternalOAuthIntegration | null> {
        const repo = this.getRepository(ds)
        const existing = await repo.findOne({ where: { id, organizationId } })
        if (!existing) return null
        if (patch.name !== undefined) existing.name = patch.name
        if (patch.enabled !== undefined) existing.enabled = patch.enabled
        if (patch.issuerUrl !== undefined) existing.issuerUrl = normalizeIssuer(patch.issuerUrl)
        if (patch.audiences !== undefined) existing.audiences = [...patch.audiences]
        if (patch.allowedClientIds !== undefined)
            existing.allowedClientIds = patch.allowedClientIds?.length ? [...patch.allowedClientIds] : null
        if (patch.permissionScopeMap !== undefined) existing.permissionScopeMap = patch.permissionScopeMap
        if (patch.customPermissionsClaimName !== undefined) existing.customPermissionsClaimName = patch.customPermissionsClaimName
        await repo.save(existing)
        return existing
    },

    async delete(ds: DataSource, id: string, organizationId: string): Promise<boolean> {
        const res = await this.getRepository(ds).delete({ id, organizationId })
        return !!res.affected && res.affected > 0
    }
}
