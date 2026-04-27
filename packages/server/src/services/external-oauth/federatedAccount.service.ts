import { DataSource } from 'typeorm'
import { FederatedAccount } from '../../database/entities/FederatedAccount'
import { v4 as uuidv4 } from 'uuid'
import { normalizeIssuer } from './issuer'

/**
 * Record (issuer, sub) in workspace for audit; optional link to Flowise user later.
 */
export async function upsertFederatedAccount(params: {
    dataSource: DataSource
    issuerUrl: string
    subject: string
    organizationId: string
    workspaceId: string
    email?: string | null
    userId?: string | null
}): Promise<void> {
    const repo = params.dataSource.getRepository(FederatedAccount)
    const issuerUrl = normalizeIssuer(params.issuerUrl)
    const existing = await repo.findOne({
        where: { issuerUrl, subject: params.subject }
    })
    if (existing) {
        existing.email = params.email ?? existing.email
        existing.userId = params.userId ?? existing.userId
        existing.organizationId = params.organizationId
        existing.workspaceId = params.workspaceId
        await repo.save(existing)
        return
    }
    const row = new FederatedAccount()
    row.id = uuidv4()
    row.issuerUrl = issuerUrl
    row.subject = params.subject
    row.organizationId = params.organizationId
    row.workspaceId = params.workspaceId
    row.email = params.email ?? null
    row.userId = params.userId ?? null
    await repo.save(row)
}
