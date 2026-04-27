import { isLikelyJwtCompact } from './bearerToken'

describe('bearerToken utils', () => {
    it('recognizes compact JWT shape', () => {
        const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
        const payload = Buffer.from(JSON.stringify({ sub: 'x' })).toString('base64url')
        const sig = 'abc'
        expect(isLikelyJwtCompact(`${header}.${payload}.${sig}`)).toBe(true)
    })

    it('rejects api-key-like strings', () => {
        expect(isLikelyJwtCompact('short')).toBe(false)
        expect(isLikelyJwtCompact('a.b')).toBe(false)
    })
})
