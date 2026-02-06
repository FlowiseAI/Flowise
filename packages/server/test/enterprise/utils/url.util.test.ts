import { describe, expect, it, afterEach } from '@jest/globals'
import { getSecureAppUrl, getSecureTokenLink } from '../../../src/enterprise/utils/url.util'

describe('URL Security Utilities', () => {
    const originalEnv = process.env.APP_URL

    afterEach(() => {
        if (originalEnv) {
            process.env.APP_URL = originalEnv
        } else {
            delete process.env.APP_URL
        }
    })

    describe('getSecureAppUrl', () => {
        it('should throw error if APP_URL is not configured', () => {
            delete process.env.APP_URL
            expect(() => getSecureAppUrl()).toThrow('APP_URL environment variable is not configured')
        })

        it('should return HTTPS URL unchanged', () => {
            process.env.APP_URL = 'https://example.com'
            expect(getSecureAppUrl()).toBe('https://example.com')
        })

        it('should convert HTTP to HTTPS for production URLs', () => {
            process.env.APP_URL = 'http://example.com'
            const result = getSecureAppUrl()
            expect(result).toBe('https://example.com')
        })

        it('should allow HTTP for localhost', () => {
            process.env.APP_URL = 'http://localhost:3000'
            expect(getSecureAppUrl()).toBe('http://localhost:3000')
        })

        it('should allow HTTP for 127.0.0.1', () => {
            process.env.APP_URL = 'http://127.0.0.1:3000'
            expect(getSecureAppUrl()).toBe('http://127.0.0.1:3000')
        })

        it('should allow HTTP for ::1 (IPv6 localhost)', () => {
            process.env.APP_URL = 'http://[::1]:3000'
            expect(getSecureAppUrl()).toBe('http://[::1]:3000')
        })

        it('should allow HTTP for 0.0.0.0', () => {
            process.env.APP_URL = 'http://0.0.0.0:3000'
            expect(getSecureAppUrl()).toBe('http://0.0.0.0:3000')
        })

        it('should append path correctly', () => {
            process.env.APP_URL = 'https://example.com'
            expect(getSecureAppUrl('/reset-password')).toBe('https://example.com/reset-password')
        })

        it('should handle trailing slash in base URL', () => {
            process.env.APP_URL = 'https://example.com/'
            expect(getSecureAppUrl('/reset-password')).toBe('https://example.com/reset-password')
        })

        it('should handle path without leading slash', () => {
            process.env.APP_URL = 'https://example.com'
            expect(getSecureAppUrl('reset-password')).toBe('https://example.com/reset-password')
        })

        it('should convert HTTP to HTTPS and append path', () => {
            process.env.APP_URL = 'http://example.com'
            expect(getSecureAppUrl('/verify')).toBe('https://example.com/verify')
        })
    })

    describe('getSecureTokenLink', () => {
        it('should create secure link with token', () => {
            process.env.APP_URL = 'https://example.com'
            const result = getSecureTokenLink('/reset-password', 'abc123')
            expect(result).toBe('https://example.com/reset-password?token=abc123')
        })

        it('should convert HTTP to HTTPS in token link', () => {
            process.env.APP_URL = 'http://example.com'
            const result = getSecureTokenLink('/reset-password', 'abc123')
            expect(result).toBe('https://example.com/reset-password?token=abc123')
        })

        it('should allow HTTP localhost in token link', () => {
            process.env.APP_URL = 'http://localhost:3000'
            const result = getSecureTokenLink('/verify', 'xyz789')
            expect(result).toBe('http://localhost:3000/verify?token=xyz789')
        })

        it('should handle complex tokens', () => {
            process.env.APP_URL = 'https://example.com'
            const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0'
            const result = getSecureTokenLink('/register', token)
            expect(result).toBe(`https://example.com/register?token=${token}`)
        })
    })

    describe('Security scenarios', () => {
        it('should prevent HTTP password reset links in production', () => {
            process.env.APP_URL = 'http://myapp.com'
            const resetLink = getSecureTokenLink('/reset-password', 'secret-token')
            expect(resetLink).toMatch(/^https:\/\//)
            expect(resetLink).not.toMatch(/^http:\/\//)
        })

        it('should prevent HTTP verification links in production', () => {
            process.env.APP_URL = 'http://myapp.com'
            const verifyLink = getSecureTokenLink('/verify', 'verify-token')
            expect(verifyLink).toMatch(/^https:\/\//)
        })

        it('should prevent HTTP registration links in production', () => {
            process.env.APP_URL = 'http://myapp.com'
            const registerLink = getSecureTokenLink('/register', 'invite-token')
            expect(registerLink).toMatch(/^https:\/\//)
        })
    })
})
