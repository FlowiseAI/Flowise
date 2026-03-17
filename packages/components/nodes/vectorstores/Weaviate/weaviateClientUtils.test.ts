import { parseHostPort } from './weaviateClientUtils'

describe('parseHostPort', () => {
    it('parses host:port format', () => {
        expect(parseHostPort('localhost:8080')).toEqual({ host: 'localhost', port: 8080 })
    })

    it('parses host without port (returns undefined port)', () => {
        expect(parseHostPort('localhost')).toEqual({ host: 'localhost' })
    })

    it('parses bracketed IPv6 with port', () => {
        expect(parseHostPort('[::1]:8080')).toEqual({ host: '::1', port: 8080 })
    })

    it('parses bracketed IPv6 without port', () => {
        expect(parseHostPort('[2001:db8::1]')).toEqual({ host: '2001:db8::1' })
    })

    it('parses unbracketed IPv6 without port (no false split)', () => {
        const result = parseHostPort('2001:db8::1')
        expect(result.host).toBe('2001:db8::1')
        expect(result.port).toBeUndefined()
    })

    it('handles invalid port (returns host as-is)', () => {
        expect(parseHostPort('host:invalid')).toEqual({ host: 'host:invalid' })
    })
})
