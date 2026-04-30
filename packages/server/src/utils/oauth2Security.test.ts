// Mock the constants module to avoid pulling in the full application dependency graph
jest.mock('./constants', () => ({
    ALLOWED_OAUTH2_TOKEN_FIELDS: ['access_token', 'refresh_token', 'token_type', 'expires_in', 'scope', 'id_token', 'granted_scope'],
    DEFAULT_ALLOWED_OAUTH2_DOMAINS: [
        'login.microsoftonline.com',
        'oauth2.googleapis.com',
        'accounts.google.com',
        'github.com',
        'login.salesforce.com',
        'test.salesforce.com',
        'oauth2.hubapi.com',
        'api.hubapi.com',
        'oauth.pipedrive.com',
        'app.clickup.com',
        'api.clickup.com',
        'login.xero.com',
        'identity.xero.com',
        'oauth2.sky.blackbaud.com',
        'app.asana.com',
        'todoist.com',
        'api.todoist.com',
        'slack.com',
        'oauth.pocketsmith.com',
        'api.notion.com',
        'api.dropboxapi.com',
        'api.box.com',
        'zoom.us',
        'auth.atlassian.com',
        'login.zoho.com',
        'accounts.zoho.com',
        'airtable.com',
        'api.linear.app',
        'discord.com'
    ]
}))

import { getOAuth2AllowedDomains, validateOAuth2Url, extractOAuth2TokenFields } from './oauth2Security'
import { ALLOWED_OAUTH2_TOKEN_FIELDS, DEFAULT_ALLOWED_OAUTH2_DOMAINS } from './constants'

const originalEnv = process.env

beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.OAUTH2_SECURITY_CHECK
    delete process.env.OAUTH2_ALLOWED_TOKEN_DOMAINS
})

afterAll(() => {
    process.env = originalEnv
})

// ---------------------------------------------------------------------------
// getOAuth2AllowedDomains
// ---------------------------------------------------------------------------
describe('getOAuth2AllowedDomains', () => {
    it('returns default domains when security check is enabled and no custom domains', () => {
        const domains = getOAuth2AllowedDomains()
        expect(domains).toEqual(expect.arrayContaining(DEFAULT_ALLOWED_OAUTH2_DOMAINS))
        expect(domains.length).toBe(DEFAULT_ALLOWED_OAUTH2_DOMAINS.length)
    })

    it('merges custom domains with defaults when security check is enabled', () => {
        process.env.OAUTH2_ALLOWED_TOKEN_DOMAINS = 'custom.example.com, another.dev'
        const domains = getOAuth2AllowedDomains()
        expect(domains).toContain('custom.example.com')
        expect(domains).toContain('another.dev')
        for (const d of DEFAULT_ALLOWED_OAUTH2_DOMAINS) {
            expect(domains).toContain(d)
        }
    })

    it('deduplicates domains that overlap with defaults', () => {
        process.env.OAUTH2_ALLOWED_TOKEN_DOMAINS = 'github.com'
        const domains = getOAuth2AllowedDomains()
        const githubCount = domains.filter((d) => d === 'github.com').length
        expect(githubCount).toBe(1)
    })

    it('returns only custom domains when security check is disabled', () => {
        process.env.OAUTH2_SECURITY_CHECK = 'false'
        process.env.OAUTH2_ALLOWED_TOKEN_DOMAINS = 'my.corp.dev'
        const domains = getOAuth2AllowedDomains()
        expect(domains).toEqual(['my.corp.dev'])
    })

    it('returns empty array when security check is disabled and no custom domains', () => {
        process.env.OAUTH2_SECURITY_CHECK = 'false'
        const domains = getOAuth2AllowedDomains()
        expect(domains).toEqual([])
    })

    it('trims whitespace and lowercases custom domains', () => {
        process.env.OAUTH2_ALLOWED_TOKEN_DOMAINS = '  MyDomain.COM , UPPER.IO  '
        const domains = getOAuth2AllowedDomains()
        expect(domains).toContain('mydomain.com')
        expect(domains).toContain('upper.io')
    })

    it('ignores empty segments from trailing/leading commas', () => {
        process.env.OAUTH2_ALLOWED_TOKEN_DOMAINS = ',,,valid.com,,,'
        const domains = getOAuth2AllowedDomains()
        expect(domains).toContain('valid.com')
        expect(domains.every((d) => d.length > 0)).toBe(true)
    })
})

// ---------------------------------------------------------------------------
// validateOAuth2Url
// ---------------------------------------------------------------------------
describe('validateOAuth2Url', () => {
    describe('with security check enabled (default)', () => {
        it('accepts HTTPS URLs on default allowed domains', () => {
            expect(() => validateOAuth2Url('https://login.microsoftonline.com/token')).not.toThrow()
            expect(() => validateOAuth2Url('https://oauth2.googleapis.com/token')).not.toThrow()
            expect(() => validateOAuth2Url('https://github.com/login/oauth/access_token')).not.toThrow()
        })

        it('accepts subdomains of allowed domains', () => {
            expect(() => validateOAuth2Url('https://accounts.zoom.us/oauth/token')).not.toThrow()
            expect(() => validateOAuth2Url('https://sub.login.microsoftonline.com/token')).not.toThrow()
        })

        it('rejects HTTP URLs', () => {
            expect(() => validateOAuth2Url('http://login.microsoftonline.com/token')).toThrow('OAuth2 URL must use HTTPS')
        })

        it('rejects domains not in the allowed list', () => {
            expect(() => validateOAuth2Url('https://evil.example.com/token')).toThrow('not in the allowed list')
        })

        it('rejects domain that only partially matches (no dot boundary)', () => {
            // "notgithub.com" should NOT match "github.com"
            expect(() => validateOAuth2Url('https://notgithub.com/token')).toThrow('not in the allowed list')
        })

        it('accepts custom domains added via env var', () => {
            process.env.OAUTH2_ALLOWED_TOKEN_DOMAINS = 'custom-idp.example.com'
            expect(() => validateOAuth2Url('https://custom-idp.example.com/token')).not.toThrow()
        })

        it('throws on invalid URL', () => {
            expect(() => validateOAuth2Url('not-a-url')).toThrow()
        })
    })

    describe('with security check disabled', () => {
        beforeEach(() => {
            process.env.OAUTH2_SECURITY_CHECK = 'false'
        })

        it('skips validation entirely when no custom domains are configured', () => {
            expect(() => validateOAuth2Url('http://anything.local:8080/token')).not.toThrow()
        })

        it('allows HTTP when custom domains are configured', () => {
            process.env.OAUTH2_ALLOWED_TOKEN_DOMAINS = 'local.dev'
            expect(() => validateOAuth2Url('http://local.dev/token')).not.toThrow()
        })

        it('still rejects domains not matching custom list when custom domains exist', () => {
            process.env.OAUTH2_ALLOWED_TOKEN_DOMAINS = 'local.dev'
            expect(() => validateOAuth2Url('http://other.dev/token')).toThrow('not in the allowed list')
        })

        it('supports subdomain matching against custom domains', () => {
            process.env.OAUTH2_ALLOWED_TOKEN_DOMAINS = 'myidp.local'
            expect(() => validateOAuth2Url('http://auth.myidp.local/token')).not.toThrow()
        })
    })
})

// ---------------------------------------------------------------------------
// extractOAuth2TokenFields
// ---------------------------------------------------------------------------
describe('extractOAuth2TokenFields', () => {
    it('extracts all recognised fields from a complete token response', () => {
        const data: Record<string, any> = {
            access_token: 'abc123',
            refresh_token: 'ref456',
            token_type: 'Bearer',
            expires_in: 3600,
            scope: 'openid profile',
            id_token: 'jwt.token.here',
            granted_scope: 'openid'
        }
        const result = extractOAuth2TokenFields(data)
        expect(result).toEqual(data)
    })

    it('omits fields not in the allowed list', () => {
        const data = {
            access_token: 'abc',
            malicious_field: 'should be removed',
            secret_key: '12345'
        }
        const result = extractOAuth2TokenFields(data)
        expect(result).toEqual({ access_token: 'abc' })
        expect(result).not.toHaveProperty('malicious_field')
        expect(result).not.toHaveProperty('secret_key')
    })

    it('returns empty object when no recognised fields are present', () => {
        const result = extractOAuth2TokenFields({ foo: 'bar', baz: 42 })
        expect(result).toEqual({})
    })

    it('preserves undefined-valued allowed fields as absent (not included)', () => {
        const result = extractOAuth2TokenFields({ access_token: undefined })
        expect(result).not.toHaveProperty('access_token')
    })

    it('preserves null-valued allowed fields', () => {
        const result = extractOAuth2TokenFields({ access_token: null })
        expect(result).toEqual({ access_token: null })
    })

    it('only includes fields from ALLOWED_OAUTH2_TOKEN_FIELDS constant', () => {
        const allFieldData: Record<string, any> = {}
        for (const field of ALLOWED_OAUTH2_TOKEN_FIELDS) {
            allFieldData[field] = `value_${field}`
        }
        allFieldData['extra'] = 'nope'

        const result = extractOAuth2TokenFields(allFieldData)
        expect(Object.keys(result).sort()).toEqual([...ALLOWED_OAUTH2_TOKEN_FIELDS].sort())
    })

    describe('throws on invalid input', () => {
        it('throws on null', () => {
            expect(() => extractOAuth2TokenFields(null as any)).toThrow('expected an object')
        })

        it('throws on undefined', () => {
            expect(() => extractOAuth2TokenFields(undefined as any)).toThrow('expected an object')
        })

        it('throws on array', () => {
            expect(() => extractOAuth2TokenFields([] as any)).toThrow('expected an object')
        })

        it('throws on string', () => {
            expect(() => extractOAuth2TokenFields('string' as any)).toThrow('expected an object')
        })

        it('throws on number', () => {
            expect(() => extractOAuth2TokenFields(42 as any)).toThrow('expected an object')
        })
    })
})
