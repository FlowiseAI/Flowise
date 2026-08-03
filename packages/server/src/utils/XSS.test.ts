// At the top of XSS.test.ts, before importing getAllowedIframeOrigins
jest.mock('./domainValidation', () => ({
    extractChatflowId: jest.fn(),
    isPublicChatflowRequest: jest.fn(),
    isTTSGenerateRequest: jest.fn(),
    validateChatflowDomain: jest.fn()
}))

jest.mock('./logger', () => ({
    __esModule: true,
    default: { warn: jest.fn(), info: jest.fn(), error: jest.fn() }
}))

import logger from './logger'
import { getAllowedIframeOrigins, getCorsOptions, getIframeSecurityHeaders, validateCorsConfig } from './XSS'

// ---------------------------------------------------------------------------
// getCorsOptions
// ---------------------------------------------------------------------------

describe('getCorsOptions', () => {
    const SAVED_CORS_ORIGINS = process.env.CORS_ORIGINS
    const SAVED_CORS_ALLOW_CREDENTIALS = process.env.CORS_ALLOW_CREDENTIALS

    afterEach(() => {
        if (SAVED_CORS_ORIGINS !== undefined) process.env.CORS_ORIGINS = SAVED_CORS_ORIGINS
        else delete process.env.CORS_ORIGINS
        if (SAVED_CORS_ALLOW_CREDENTIALS !== undefined) process.env.CORS_ALLOW_CREDENTIALS = SAVED_CORS_ALLOW_CREDENTIALS
        else delete process.env.CORS_ALLOW_CREDENTIALS
    })

    function getCredentials(corsOrigins: string | undefined, corsAllowCredentials: string | undefined): boolean {
        if (corsOrigins === undefined) delete process.env.CORS_ORIGINS
        else process.env.CORS_ORIGINS = corsOrigins
        if (corsAllowCredentials === undefined) delete process.env.CORS_ALLOW_CREDENTIALS
        else process.env.CORS_ALLOW_CREDENTIALS = corsAllowCredentials

        let captured: any
        getCorsOptions()({ url: '/api/v1/test' }, (_err: any, options: any) => {
            captured = options
        })
        return captured.credentials
    }

    describe('wildcard + credentials guard', () => {
        it('forces credentials to false when CORS_ORIGINS=* and CORS_ALLOW_CREDENTIALS=true', () => {
            expect(getCredentials('*', 'true')).toBe(false)
        })

        it('leaves credentials false when CORS_ORIGINS=* and CORS_ALLOW_CREDENTIALS is unset', () => {
            expect(getCredentials('*', undefined)).toBe(false)
        })

        it('allows credentials when CORS_ORIGINS is an explicit list', () => {
            expect(getCredentials('https://trusted.example.com', 'true')).toBe(true)
        })

        it('allows credentials when CORS_ORIGINS has multiple explicit origins', () => {
            expect(getCredentials('https://app.example.com,https://admin.example.com', 'true')).toBe(true)
        })

        it('uses credentials=false when CORS_ALLOW_CREDENTIALS is unset regardless of CORS_ORIGINS', () => {
            expect(getCredentials('https://trusted.example.com', undefined)).toBe(false)
        })
    })

    describe('validateCorsConfig', () => {
        beforeEach(() => jest.clearAllMocks())

        it('warns when CORS_ORIGINS=* and CORS_ALLOW_CREDENTIALS=true', () => {
            process.env.CORS_ORIGINS = '*'
            process.env.CORS_ALLOW_CREDENTIALS = 'true'
            validateCorsConfig()
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('[CORS]'))
        })

        it('does not warn when CORS_ORIGINS=* without CORS_ALLOW_CREDENTIALS', () => {
            process.env.CORS_ORIGINS = '*'
            delete process.env.CORS_ALLOW_CREDENTIALS
            validateCorsConfig()
            expect(logger.warn).not.toHaveBeenCalled()
        })

        it('does not warn when CORS_ORIGINS is an explicit list with CORS_ALLOW_CREDENTIALS=true', () => {
            process.env.CORS_ORIGINS = 'https://trusted.example.com'
            process.env.CORS_ALLOW_CREDENTIALS = 'true'
            validateCorsConfig()
            expect(logger.warn).not.toHaveBeenCalled()
        })
    })
})

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
            expect(getAllowedIframeOrigins()).toBe('https://example.com')
        })

        it('should handle leading comma', () => {
            process.env.IFRAME_ORIGINS = ',https://example.com'
            expect(getAllowedIframeOrigins()).toBe('https://example.com')
        })

        it('should handle multiple consecutive commas', () => {
            process.env.IFRAME_ORIGINS = 'https://domain1.com,,https://domain2.com'
            expect(getAllowedIframeOrigins()).toBe('https://domain1.com https://domain2.com')
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

describe('getIframeSecurityHeaders', () => {
    const originalEnv = process.env.IFRAME_ORIGINS

    afterEach(() => {
        if (originalEnv !== undefined) {
            process.env.IFRAME_ORIGINS = originalEnv
        } else {
            delete process.env.IFRAME_ORIGINS
        }
    })

    it('returns CSP only for wildcard allowlists', () => {
        process.env.IFRAME_ORIGINS = '*'
        expect(getIframeSecurityHeaders()).toEqual({
            'Content-Security-Policy': 'frame-ancestors *'
        })
    })

    it("returns SAMEORIGIN only for 'self'", () => {
        process.env.IFRAME_ORIGINS = "'self'"
        expect(getIframeSecurityHeaders()).toEqual({
            'Content-Security-Policy': "frame-ancestors 'self'",
            'X-Frame-Options': 'SAMEORIGIN'
        })
    })

    it("returns DENY for 'none'", () => {
        process.env.IFRAME_ORIGINS = "'none'"
        expect(getIframeSecurityHeaders()).toEqual({
            'Content-Security-Policy': "frame-ancestors 'none'",
            'X-Frame-Options': 'DENY'
        })
    })

    it('omits X-Frame-Options for custom allowlists', () => {
        process.env.IFRAME_ORIGINS = 'https://embed.example.com,https://admin.example.com'
        expect(getIframeSecurityHeaders()).toEqual({
            'Content-Security-Policy': 'frame-ancestors https://embed.example.com https://admin.example.com'
        })
    })
})
