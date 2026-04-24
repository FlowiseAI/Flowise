import { extractScopes, mapTokenToFlowisePermissions } from './mapPermissions'
import type { ExternalOAuthIntegration } from '../../database/entities/ExternalOAuthIntegration'

describe('external oauth mapPermissions', () => {
    it('extracts scp array from payload', () => {
        const scopes = extractScopes({ scp: ['flowise.read', 'openid'] } as Record<string, unknown>)
        expect(scopes).toContain('flowise.read')
        expect(scopes).toContain('openid')
    })

    it('extracts scope space-separated string', () => {
        const scopes = extractScopes({ scope: 'a b c' } as Record<string, unknown>)
        expect(scopes.sort()).toEqual(['a', 'b', 'c'])
    })

    it('maps scopes via permissionScopeMap', () => {
        const integration = {
            permissionScopeMap: {
                'flowise.chatflows.read': ['chatflows:view']
            }
        } as unknown as ExternalOAuthIntegration
        const perms = mapTokenToFlowisePermissions({ scp: ['flowise.chatflows.read'] } as Record<string, unknown>, integration)
        expect(perms).toEqual(['chatflows:view'])
    })

    it('merges custom permissions claim', () => {
        const integration = {
            permissionScopeMap: {},
            customPermissionsClaimName: 'flowise_permissions'
        } as unknown as ExternalOAuthIntegration
        const perms = mapTokenToFlowisePermissions(
            {
                flowise_permissions: ['agentflows:view']
            } as Record<string, unknown>,
            integration
        )
        expect(perms).toEqual(['agentflows:view'])
    })
})
