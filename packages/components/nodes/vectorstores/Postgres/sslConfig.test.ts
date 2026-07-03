import { resolvePostgresSSL } from './sslConfig'

describe('resolvePostgresSSL', () => {
    it('falls back to the boolean toggle when Additional Configuration has no ssl', () => {
        expect(resolvePostgresSSL({}, true)).toBe(true)
        expect(resolvePostgresSSL({}, false)).toBe(false)
        expect(resolvePostgresSSL({ connectTimeout: 5000 }, true)).toBe(true)
    })

    it('falls back to the boolean toggle when Additional Configuration is undefined', () => {
        expect(resolvePostgresSSL(undefined, true)).toBe(true)
        expect(resolvePostgresSSL(undefined, false)).toBe(false)
    })

    it('prefers a user-supplied ssl object over the boolean toggle', () => {
        const ssl = { rejectUnauthorized: true, ca: 'CERT' }
        // custom CA must win even when the toggle is off (AWS RDS / corporate CA case)
        expect(resolvePostgresSSL({ ssl }, false)).toBe(ssl)
        expect(resolvePostgresSSL({ ssl }, true)).toBe(ssl)
    })

    it('respects an explicit ssl:false in Additional Configuration', () => {
        expect(resolvePostgresSSL({ ssl: false }, true)).toBe(false)
    })

    it('respects rejectUnauthorized:false for self-signed certificates', () => {
        const ssl = { rejectUnauthorized: false }
        expect(resolvePostgresSSL({ ssl }, false)).toBe(ssl)
    })
})
