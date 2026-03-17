import { parseHostPort } from './weaviateClientUtils'

describe('parseHostPort', () => {
    it('parses host:port format', () => {
        expect(parseHostPort('localhost:8080')).toEqual({ host: 'localhost', port: 8080 })
    })

    it('parses host without port (returns default 8080)', () => {
        expect(parseHostPort('localhost')).toEqual({ host: 'localhost', port: 8080 })
    })

    it('parses IPv6-style host with port', () => {
        expect(parseHostPort('2001:db8::1:8080')).toEqual({ host: '2001:db8::1', port: 8080 })
    })

    it('handles invalid port (returns default 8080)', () => {
        expect(parseHostPort('host:invalid')).toEqual({ host: 'host:invalid', port: 8080 })
    })
})
