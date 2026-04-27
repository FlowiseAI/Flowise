import { DataSource } from 'typeorm'
import { Organization } from '../../enterprise/database/entities/organization.entity'
import { Workspace } from '../../enterprise/database/entities/workspace.entity'
import type { LoggedInUser } from '../../enterprise/Interface.Enterprise'
import type { IdentityManager } from '../../IdentityManager'
import logger from '../../utils/logger'
import { isLikelyJwtCompact } from '../../utils/bearerToken'
import { verifyExternalAccessToken, unsafeDecodeIss } from './verifyAccessToken'
import { externalOAuthIntegrationService } from './externalOAuthIntegration.service'
import { buildExternalOAuthUserContext } from './buildExternalUser'
import { upsertFederatedAccount } from './federatedAccount.service'

/**
 * Attempts JWT access-token auth from an external IdP. Returns null if the Bearer value
 * is not an external token (caller should fall back to Flowise API key).
 */
export async function tryAuthenticateExternalBearer(
    bearerSecret: string,
    dataSource: DataSource,
    identityManager: IdentityManager
): Promise<LoggedInUser | null> {
    if (!isLikelyJwtCompact(bearerSecret)) {
        return null
    }

    const iss = unsafeDecodeIss(bearerSecret)
    if (!iss) {
        return null
    }

    const candidates = await externalOAuthIntegrationService.findEnabledByIssuerUrl(dataSource, iss)
    if (!candidates.length) {
        return null
    }

    for (const integration of candidates) {
        try {
            const verified = await verifyExternalAccessToken(bearerSecret, integration)
            const workspace = await dataSource.getRepository(Workspace).findOne({
                where: { id: integration.workspaceId }
            })
            if (!workspace || workspace.organizationId !== integration.organizationId) {
                logger.warn(`[external-oauth]: Invalid workspace binding for integration ${integration.id}`)
                continue
            }
            const org = await dataSource.getRepository(Organization).findOne({
                where: { id: integration.organizationId }
            })
            if (!org) {
                logger.warn(`[external-oauth]: Organization missing for integration ${integration.id}`)
                continue
            }

            const sub = typeof verified.payload['sub'] === 'string' ? verified.payload['sub'] : ''
            if (sub) {
                const email =
                    typeof verified.payload['email'] === 'string'
                        ? verified.payload['email']
                        : typeof verified.payload['preferred_username'] === 'string'
                        ? verified.payload['preferred_username']
                        : null
                await upsertFederatedAccount({
                    dataSource,
                    issuerUrl: integration.issuerUrl,
                    subject: sub,
                    organizationId: org.id,
                    workspaceId: workspace.id,
                    email
                })
            }

            return await buildExternalOAuthUserContext({
                verified,
                integration,
                workspace,
                org,
                identityManager
            })
        } catch (e) {
            logger.info(
                `[external-oauth]: Token verification failed for integration ${integration.id}: ${e instanceof Error ? e.message : e}`
            )
            // try next integration with same issuer (different audience configs)
            continue
        }
    }

    return null
}
