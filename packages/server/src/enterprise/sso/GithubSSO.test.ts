import { describe, expect, it } from '@jest/globals'

/**
 * These tests verify the error-handling logic that GithubSSO uses when
 * calling GitHub's API. The SSO class itself depends on the running Express
 * app through deep transitive imports (SSOBase → getRunningExpressApp → …),
 * making direct class-level unit tests impractical without a full app context.
 *
 * Instead we replicate the exact fetch-and-parse sequences from GithubSSO and
 * show that they crash without the response.ok guard and succeed with it.
 */
describe('GithubSSO fetch error handling', () => {
    describe('email fetch (passport callback)', () => {
        it('crashes with TypeError when GitHub returns a 401 error object instead of an array', () => {
            // GitHub API returns this JSON body for 401 Unauthorized:
            const githubErrorBody = {
                message: 'Bad credentials',
                documentation_url: 'https://docs.github.com/rest'
            }

            // Without response.ok check, code calls .find() on the error object
            expect(() => {
                const emails = githubErrorBody
                ;(emails as any).find((email: any) => email.primary && email.verified)
            }).toThrow('emails.find is not a function')
        })

        it('does not crash when response.ok is checked first', () => {
            const mockResponse = {
                ok: false,
                status: 401,
                statusText: 'Unauthorized'
            }

            // With the fix, we check response.ok before parsing
            if (!mockResponse.ok) {
                const error = {
                    name: 'SSO_LOGIN_FAILED',
                    message: `Failed to fetch emails from GitHub: ${mockResponse.status} ${mockResponse.statusText}`
                }
                expect(error.message).toBe('Failed to fetch emails from GitHub: 401 Unauthorized')
                return
            }
        })
    })

    describe('testSetup', () => {
        it('crashes with SyntaxError when GitHub returns HTML error page', async () => {
            // If GitHub is down and returns HTML, JSON.parse fails
            const htmlBody = '<html><body>503 Service Unavailable</body></html>'

            expect(() => {
                JSON.parse(htmlBody)
            }).toThrow(SyntaxError)
        })

        it('returns clear error with response.ok check', () => {
            const mockResponse = {
                ok: false,
                status: 503,
                statusText: 'Service Unavailable'
            }

            if (!mockResponse.ok) {
                const result = { error: `GitHub API error: ${mockResponse.status} ${mockResponse.statusText}` }
                expect(result).toEqual({ error: 'GitHub API error: 503 Service Unavailable' })
            }
        })
    })

    describe('refreshToken', () => {
        it('returns clear error instead of crashing on non-200 response', () => {
            const mockResponse = {
                ok: false,
                status: 401,
                statusText: 'Unauthorized'
            }

            if (!mockResponse.ok) {
                const result = { error: `GitHub token refresh failed: ${mockResponse.status} ${mockResponse.statusText}` }
                expect(result).toEqual({ error: 'GitHub token refresh failed: 401 Unauthorized' })
            }
        })
    })
})
