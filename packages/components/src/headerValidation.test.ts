import { redactSensitiveHeaders, validateCustomHeaders } from './headerValidation'

describe('validateCustomHeaders', () => {
    it('accepts a typical auth header set', () => {
        expect(() =>
            validateCustomHeaders({
                Authorization: 'Bearer abc.def.ghi',
                'X-Api-Key': 'secret-value',
                'Content-Type': 'application/json'
            })
        ).not.toThrow()
    })

    it('rejects non-object input', () => {
        expect(() => validateCustomHeaders(null as any)).toThrow(/expected an object/)
        expect(() => validateCustomHeaders('x' as any)).toThrow(/expected an object/)
    })

    it('rejects too many headers', () => {
        const headers: Record<string, string> = {}
        for (let i = 0; i < 26; i++) headers[`X-H${i}`] = 'v'
        expect(() => validateCustomHeaders(headers)).toThrow(/too many entries/)
    })

    it('rejects empty key', () => {
        expect(() => validateCustomHeaders({ '': 'v' })).toThrow(/non-empty string/)
    })

    it('rejects keys with illegal characters', () => {
        expect(() => validateCustomHeaders({ 'X Bad': 'v' })).toThrow(/illegal characters/)
        expect(() => validateCustomHeaders({ 'X:Bad': 'v' })).toThrow(/illegal characters/)
        expect(() => validateCustomHeaders({ 'X\tBad': 'v' })).toThrow(/illegal characters/)
    })

    it('rejects oversized keys and values', () => {
        expect(() => validateCustomHeaders({ ['X-' + 'a'.repeat(200)]: 'v' })).toThrow(/key exceeds/)
        expect(() => validateCustomHeaders({ 'X-Ok': 'a'.repeat(2049) })).toThrow(/value exceeds/)
    })

    it('rejects denied header names case-insensitively', () => {
        for (const name of ['Host', 'HOST', 'cookie', 'Set-Cookie', 'Transfer-Encoding', 'Proxy-Authorization']) {
            expect(() => validateCustomHeaders({ [name]: 'v' })).toThrow(/not allowed/)
        }
    })

    it('rejects Proxy-*, X-Forwarded-*, Sec-* prefixes', () => {
        expect(() => validateCustomHeaders({ 'Proxy-Custom': 'v' })).toThrow(/not allowed/)
        expect(() => validateCustomHeaders({ 'X-Forwarded-For': '1.2.3.4' })).toThrow(/not allowed/)
        expect(() => validateCustomHeaders({ 'Sec-Fetch-Mode': 'cors' })).toThrow(/not allowed/)
    })

    it('rejects CRLF injection in values', () => {
        expect(() => validateCustomHeaders({ 'X-Foo': 'val\r\nInjected: 1' })).toThrow(/control characters/)
        expect(() => validateCustomHeaders({ 'X-Foo': 'val\nInjected: 1' })).toThrow(/control characters/)
        expect(() => validateCustomHeaders({ 'X-Foo': 'val\rInjected: 1' })).toThrow(/control characters/)
    })

    it('rejects other control characters but accepts tab', () => {
        expect(() => validateCustomHeaders({ 'X-Foo': 'bad\u0001' })).toThrow(/control characters/)
        expect(() => validateCustomHeaders({ 'X-Foo': 'tab\there' })).not.toThrow()
    })

    it('rejects non-string values', () => {
        expect(() => validateCustomHeaders({ 'X-Foo': 123 as any })).toThrow(/must be a string/)
    })
})

describe('redactSensitiveHeaders', () => {
    it('returns empty object when headers are undefined or null', () => {
        expect(redactSensitiveHeaders(undefined)).toEqual({})
        expect(redactSensitiveHeaders(null)).toEqual({})
    })

    it('redacts authorization header regardless of casing', () => {
        const result = redactSensitiveHeaders({ Authorization: 'Bearer abc', AUTHORIZATION: 'token' })
        expect(result.Authorization).toBe('[REDACTED]')
        expect(result.AUTHORIZATION).toBe('[REDACTED]')
    })

    it('redacts the full set of credential-bearing headers', () => {
        const result = redactSensitiveHeaders({
            authorization: 'Bearer x',
            'proxy-authorization': 'Basic y',
            cookie: 'session=z',
            'x-api-key': 'apikey',
            'x-auth-token': 'token',
            'x-amz-security-token': 'aws-token'
        })
        Object.values(result).forEach((v) => expect(v).toBe('[REDACTED]'))
    })

    it('passes non-sensitive headers through unchanged', () => {
        const result = redactSensitiveHeaders({
            'content-type': 'application/json',
            'user-agent': 'GitHub-Hookshot/abc',
            'x-github-event': 'push',
            authorization: 'Bearer leak'
        })
        expect(result['content-type']).toBe('application/json')
        expect(result['user-agent']).toBe('GitHub-Hookshot/abc')
        expect(result['x-github-event']).toBe('push')
        expect(result.authorization).toBe('[REDACTED]')
    })
})
