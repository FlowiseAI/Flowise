// At the top of XSS.test.ts, before importing getAllowedIframeOrigins
jest.mock('./domainValidation', () => ({
    extractChatflowId: jest.fn(),
    isPublicChatflowRequest: jest.fn(),
    isTTSGenerateRequest: jest.fn(),
    validateChatflowDomain: jest.fn()
}))

import { getAllowedIframeOrigins } from './XSS'

describe('getAllowedIframeOrigins', () => {
    const originalEnv = process.env.IFRAME_ORIGINS

    afterEach(() => {
        // Restore original environment variable after each test
        if (originalEnv !== undefined) {
            process.env.IFRAME_ORIGINS = originalEnv
        } else {
            delete process.env.IFRAME_ORIGINS
        }
    })

    describe('default behavior', () => {
        it("should return 'self' when IFRAME_ORIGINS is not set", () => {
            delete process.env.IFRAME_ORIGINS
            expect(getAllowedIframeOrigins()).toBe("'self'")
        })

        it("should return 'self' when IFRAME_ORIGINS is empty string", () => {
            process.env.IFRAME_ORIGINS = ''
            expect(getAllowedIframeOrigins()).toBe("'self'")
        })

        it("should return 'self' when IFRAME_ORIGINS is only whitespace", () => {
            process.env.IFRAME_ORIGINS = '   '
            expect(getAllowedIframeOrigins()).toBe("'self'")
        })
    })

    describe('CSP special values', () => {
        it("should handle 'self' value", () => {
            process.env.IFRAME_ORIGINS = "'self'"
            expect(getAllowedIframeOrigins()).toBe("'self'")
        })

        it("should handle 'none' value", () => {
            process.env.IFRAME_ORIGINS = "'none'"
            expect(getAllowedIframeOrigins()).toBe("'none'")
        })

        it('should handle wildcard * value', () => {
            process.env.IFRAME_ORIGINS = '*'
            expect(getAllowedIframeOrigins()).toBe('*')
        })
    })

    describe('single domain', () => {
        it('should handle a single FQDN', () => {
            process.env.IFRAME_ORIGINS = 'https://example.com'
            expect(getAllowedIframeOrigins()).toBe('https://example.com')
        })

        it('should trim whitespace from single domain', () => {
            process.env.IFRAME_ORIGINS = '  https://example.com  '
            expect(getAllowedIframeOrigins()).toBe('https://example.com')
        })
    })

    describe('multiple domains', () => {
        it('should convert comma-separated domains to space-separated', () => {
            process.env.IFRAME_ORIGINS = 'https://domain1.com,https://domain2.com'
            expect(getAllowedIframeOrigins()).toBe('https://domain1.com https://domain2.com')
        })

        it('should handle multiple domains with spaces', () => {
            process.env.IFRAME_ORIGINS = 'https://domain1.com, https://domain2.com, https://domain3.com'
            expect(getAllowedIframeOrigins()).toBe('https://domain1.com https://domain2.com https://domain3.com')
        })

        it('should trim individual domains in comma-separated list', () => {
            process.env.IFRAME_ORIGINS = '  https://app.com  ,  https://admin.com  '
            expect(getAllowedIframeOrigins()).toBe('https://app.com https://admin.com')
        })
    })

    describe('edge cases', () => {
        it('should handle domains with ports', () => {
            process.env.IFRAME_ORIGINS = 'https://localhost:3000,https://localhost:4000'
            expect(getAllowedIframeOrigins()).toBe('https://localhost:3000 https://localhost:4000')
        })

        it('should handle domains with paths (though not typical for CSP)', () => {
            process.env.IFRAME_ORIGINS = 'https://example.com/path1,https://example.com/path2'
            expect(getAllowedIframeOrigins()).toBe('https://example.com/path1 https://example.com/path2')
        })

        it('should handle mixed protocols', () => {
            process.env.IFRAME_ORIGINS = 'http://example.com,https://secure.com'
            expect(getAllowedIframeOrigins()).toBe('http://example.com https://secure.com')
        })

        it('should handle trailing comma', () => {
            process.env.IFRAME_ORIGINS = 'https://example.com,'
            expect(getAllowedIframeOrigins()).toBe('https://example.com ')
        })

        it('should handle leading comma', () => {
            process.env.IFRAME_ORIGINS = ',https://example.com'
            expect(getAllowedIframeOrigins()).toBe(' https://example.com')
        })

        it('should handle multiple consecutive commas', () => {
            process.env.IFRAME_ORIGINS = 'https://domain1.com,,https://domain2.com'
            expect(getAllowedIframeOrigins()).toBe('https://domain1.com  https://domain2.com')
        })
    })

    describe('real-world scenarios', () => {
        it('should handle typical production configuration', () => {
            process.env.IFRAME_ORIGINS = 'https://app.example.com,https://admin.example.com,https://dashboard.example.com'
            expect(getAllowedIframeOrigins()).toBe('https://app.example.com https://admin.example.com https://dashboard.example.com')
        })

        it('should handle development configuration with localhost', () => {
            process.env.IFRAME_ORIGINS = 'http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000'
            expect(getAllowedIframeOrigins()).toBe('http://localhost:3000 http://localhost:3001 http://127.0.0.1:3000')
        })

        it("should handle mix of 'self' and domains", () => {
            process.env.IFRAME_ORIGINS = "'self',https://trusted.com"
            expect(getAllowedIframeOrigins()).toBe("'self' https://trusted.com")
        })
    })
})
