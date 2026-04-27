import { Organization } from '../../enterprise/database/entities/organization.entity'
import { Workspace } from '../../enterprise/database/entities/workspace.entity'
import type { LoggedInUser } from '../../enterprise/Interface.Enterprise'
import type { IdentityManager } from '../../IdentityManager'
import { Platform } from '../../Interface'
import type { ExternalOAuthIntegration } from '../../database/entities/ExternalOAuthIntegration'
import { mapTokenToFlowisePermissions } from './mapPermissions'
import type { VerifiedExternalToken } from './verifyAccessToken'

/** Minimal LoggedInUser for external OAuth API access (mirrors API-key middleware shape). */
export async function buildExternalOAuthUserContext(params: {
    verified: VerifiedExternalToken
    integration: ExternalOAuthIntegration
    workspace: Workspace
    org: Organization
    identityManager: IdentityManager
}): Promise<LoggedInUser> {
    const { verified, integration, workspace, org, identityManager } = params
    const permissions = mapTokenToFlowisePermissions(verified.payload as Record<string, unknown>, integration)
    const sub = typeof verified.payload['sub'] === 'string' ? verified.payload['sub'] : 'unknown'
    const email =
        typeof verified.payload['email'] === 'string'
            ? verified.payload['email']
            : typeof verified.payload['preferred_username'] === 'string'
            ? verified.payload['preferred_username']
            : ''

    const subscriptionId = org.subscriptionId as string
    const customerId = org.customerId as string
    let features: Record<string, string> = {}
    if (identityManager.getPlatformType() !== Platform.OPEN_SOURCE) {
        features = await identityManager.getFeaturesByPlan(subscriptionId)
    }
    const productId = await identityManager.getProductIdFromSubscription(subscriptionId)

    return {
        id: `ext|${sub}`,
        email,
        name: email || sub,
        roleId: '',
        activeOrganizationId: org.id,
        activeOrganizationSubscriptionId: subscriptionId,
        activeOrganizationCustomerId: customerId,
        activeOrganizationProductId: productId,
        isOrganizationAdmin: false,
        activeWorkspaceId: workspace.id,
        activeWorkspace: workspace.name,
        assignedWorkspaces: [],
        permissions,
        features
    }
}
