import axios, { AxiosRequestConfig } from 'axios'
import dns from 'dns/promises'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import fetch, { Headers, Response } from 'node-fetch'
import { isDeniedIP, secureAxiosRequest, secureFetch } from './httpSecurity'

jest.mock('axios', () => {
    const actual = jest.requireActual<typeof import('axios')>('axios')
    return {
        ...actual,
        __esModule: true,
        default: jest.fn()
    }
})
jest.mock('dns/promises')
jest.mock('node-fetch', () => {
    const actual = jest.requireActual<typeof import('node-fetch')>('node-fetch')
    return {
        ...actual,
        __esModule: true,
        default: jest.fn()
    }
})

const mockedAxios = axios as jest.MockedFunction<typeof axios>
const mockedDnsLookup = dns.lookup as jest.MockedFunction<typeof dns.lookup>
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>

const sensitiveHeaders = {
    Authorization: 'Bearer secret',
    Cookie: 'session=secret',
    Host: 'source.example',
    'X-Api-Key': 'secret-key'
}

// Test deny list covering common SSRF targets
const TEST_DENY_LIST = [
    '0.0.0.0',
    '10.0.0.0/8', // RFC1918 Class A
    '127.0.0.0/8', // Loopback
    '169.254.0.0/16', // Link-local (includes cloud metadata)
    '169.254.169.254', // AWS metadata (specific)
    '172.16.0.0/12', // RFC1918 Class B
    '192.168.0.0/16', // RFC1918 Class C
    '224.0.0.0/4', // Multicast
    '240.0.0.0/4', // Reserved
    '255.255.255.255/32', // Broadcast
    '::1', // IPv6 loopback
    'fc00::/7', // IPv6 ULA
    'fe80::/10', // IPv6 link-local
    'ff00::/8' // IPv6 multicast
]

describe('isDeniedIP - SSRF Protection', () => {
    describe('IPv4 Address Blocking (Normal Cases)', () => {
        it('should block loopback address 127.0.0.1', () => {
            expect(() => isDeniedIP('127.0.0.1', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should block AWS metadata endpoint 169.254.169.254', () => {
            expect(() => isDeniedIP('169.254.169.254', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should block RFC1918 private address 10.0.0.1', () => {
            expect(() => isDeniedIP('10.0.0.1', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should block RFC1918 private address 192.168.1.1', () => {
            expect(() => isDeniedIP('192.168.1.1', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should block RFC1918 private address 172.16.0.1', () => {
            expect(() => isDeniedIP('172.16.0.1', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should block 0.0.0.0', () => {
            expect(() => isDeniedIP('0.0.0.0', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should block multicast address 224.0.0.1', () => {
            expect(() => isDeniedIP('224.0.0.1', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should block reserved address 240.0.0.1', () => {
            expect(() => isDeniedIP('240.0.0.1', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should block broadcast address 255.255.255.255', () => {
            expect(() => isDeniedIP('255.255.255.255', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should allow public IPv4 address 8.8.8.8', () => {
            expect(() => isDeniedIP('8.8.8.8', TEST_DENY_LIST)).not.toThrow()
        })

        it('should allow public IPv4 address 1.1.1.1', () => {
            expect(() => isDeniedIP('1.1.1.1', TEST_DENY_LIST)).not.toThrow()
        })
    })

    describe('IPv4-Mapped IPv6 Address Blocking (SSRF Bypass Prevention)', () => {
        it('should block IPv4-mapped IPv6 loopback ::ffff:127.0.0.1', () => {
            expect(() => isDeniedIP('::ffff:127.0.0.1', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should block IPv4-mapped IPv6 AWS metadata ::ffff:169.254.169.254', () => {
            expect(() => isDeniedIP('::ffff:169.254.169.254', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should block IPv4-mapped IPv6 private address ::ffff:10.0.0.1', () => {
            expect(() => isDeniedIP('::ffff:10.0.0.1', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should block IPv4-mapped IPv6 private address ::ffff:192.168.1.1', () => {
            expect(() => isDeniedIP('::ffff:192.168.1.1', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should block IPv4-mapped IPv6 private address ::ffff:172.16.0.1', () => {
            expect(() => isDeniedIP('::ffff:172.16.0.1', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should block IPv4-mapped IPv6 link-local ::ffff:169.254.0.1', () => {
            expect(() => isDeniedIP('::ffff:169.254.0.1', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should block IPv4-mapped IPv6 broadcast ::ffff:255.255.255.255', () => {
            expect(() => isDeniedIP('::ffff:255.255.255.255', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should block IPv4-mapped IPv6 multicast ::ffff:224.0.0.1', () => {
            expect(() => isDeniedIP('::ffff:224.0.0.1', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should allow IPv4-mapped IPv6 public address ::ffff:8.8.8.8', () => {
            expect(() => isDeniedIP('::ffff:8.8.8.8', TEST_DENY_LIST)).not.toThrow()
        })

        it('should allow IPv4-mapped IPv6 public address ::ffff:1.1.1.1', () => {
            expect(() => isDeniedIP('::ffff:1.1.1.1', TEST_DENY_LIST)).not.toThrow()
        })
    })

    describe('IPv6 Address Blocking', () => {
        it('should block IPv6 loopback ::1', () => {
            expect(() => isDeniedIP('::1', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should block IPv6 link-local fe80::1', () => {
            expect(() => isDeniedIP('fe80::1', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should block IPv6 ULA fc00::1', () => {
            expect(() => isDeniedIP('fc00::1', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should block IPv6 multicast ff02::1', () => {
            expect(() => isDeniedIP('ff02::1', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should allow public IPv6 address 2001:4860:4860::8888', () => {
            expect(() => isDeniedIP('2001:4860:4860::8888', TEST_DENY_LIST)).not.toThrow()
        })
    })

    describe('CIDR Range Matching', () => {
        it('should block IP at start of CIDR range 10.0.0.0', () => {
            expect(() => isDeniedIP('10.0.0.0', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should block IP in middle of CIDR range 10.128.0.1', () => {
            expect(() => isDeniedIP('10.128.0.1', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should block IP at end of CIDR range 10.255.255.255', () => {
            expect(() => isDeniedIP('10.255.255.255', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should block IP in 172.16.0.0/12 range - 172.31.255.255', () => {
            expect(() => isDeniedIP('172.31.255.255', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should allow IP just outside 172.16.0.0/12 range - 172.32.0.1', () => {
            expect(() => isDeniedIP('172.32.0.1', TEST_DENY_LIST)).not.toThrow()
        })

        it('should block IP in 169.254.0.0/16 range - 169.254.100.100', () => {
            expect(() => isDeniedIP('169.254.100.100', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })
    })

    describe('CIDR Range Matching with IPv4-Mapped IPv6', () => {
        it('should block IPv4-mapped IPv6 at start of CIDR range ::ffff:10.0.0.0', () => {
            expect(() => isDeniedIP('::ffff:10.0.0.0', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should block IPv4-mapped IPv6 in middle of CIDR range ::ffff:10.128.0.1', () => {
            expect(() => isDeniedIP('::ffff:10.128.0.1', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should block IPv4-mapped IPv6 at end of CIDR range ::ffff:10.255.255.255', () => {
            expect(() => isDeniedIP('::ffff:10.255.255.255', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should block IPv4-mapped IPv6 in 169.254.0.0/16 range - ::ffff:169.254.100.100', () => {
            expect(() => isDeniedIP('::ffff:169.254.100.100', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should allow IPv4-mapped IPv6 outside deny ranges - ::ffff:172.32.0.1', () => {
            expect(() => isDeniedIP('::ffff:172.32.0.1', TEST_DENY_LIST)).not.toThrow()
        })
    })

    describe('Exact IP Match (Non-CIDR)', () => {
        it('should block exact match 169.254.169.254', () => {
            expect(() => isDeniedIP('169.254.169.254', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should block exact match 0.0.0.0', () => {
            expect(() => isDeniedIP('0.0.0.0', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })
    })

    describe('Edge Cases and Security', () => {
        it('should handle empty deny list without errors', () => {
            expect(() => isDeniedIP('127.0.0.1', [])).not.toThrow()
        })

        it('should handle multiple CIDR entries correctly', () => {
            const multiCIDR = ['10.0.0.0/8', '192.168.0.0/16', '172.16.0.0/12']
            expect(() => isDeniedIP('10.5.5.5', multiCIDR)).toThrow('Access to this host is denied by policy.')
            expect(() => isDeniedIP('192.168.5.5', multiCIDR)).toThrow('Access to this host is denied by policy.')
            expect(() => isDeniedIP('172.20.5.5', multiCIDR)).toThrow('Access to this host is denied by policy.')
        })

        it('should block all variations of loopback', () => {
            expect(() => isDeniedIP('127.0.0.1', TEST_DENY_LIST)).toThrow()
            expect(() => isDeniedIP('127.1.1.1', TEST_DENY_LIST)).toThrow()
            expect(() => isDeniedIP('127.255.255.255', TEST_DENY_LIST)).toThrow()
        })

        it('should block all variations of loopback via IPv4-mapped IPv6', () => {
            expect(() => isDeniedIP('::ffff:127.0.0.1', TEST_DENY_LIST)).toThrow()
            expect(() => isDeniedIP('::ffff:127.1.1.1', TEST_DENY_LIST)).toThrow()
            expect(() => isDeniedIP('::ffff:127.255.255.255', TEST_DENY_LIST)).toThrow()
        })
    })

    describe('Cloud Metadata Endpoints (Real-world SSRF Targets)', () => {
        it('should block AWS metadata endpoint 169.254.169.254', () => {
            expect(() => isDeniedIP('169.254.169.254', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should block AWS metadata via IPv4-mapped IPv6 ::ffff:169.254.169.254', () => {
            expect(() => isDeniedIP('::ffff:169.254.169.254', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should block any IP in 169.254.0.0/16 range (link-local)', () => {
            expect(() => isDeniedIP('169.254.1.1', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
            expect(() => isDeniedIP('169.254.255.255', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should block link-local via IPv4-mapped IPv6', () => {
            expect(() => isDeniedIP('::ffff:169.254.1.1', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
            expect(() => isDeniedIP('::ffff:169.254.255.255', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })
    })

    describe('Regression Tests - CVE-2026-31829 Related', () => {
        it('should not allow bypassing via IPv4-mapped IPv6 to localhost', () => {
            // This would have bypassed the old vulnerable code
            expect(() => isDeniedIP('::ffff:127.0.0.1', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should not allow bypassing via IPv4-mapped IPv6 to private networks', () => {
            // These would have bypassed the old vulnerable code
            expect(() => isDeniedIP('::ffff:10.0.0.1', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
            expect(() => isDeniedIP('::ffff:192.168.0.1', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
            expect(() => isDeniedIP('::ffff:172.16.0.1', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })

        it('should not allow bypassing via IPv4-mapped IPv6 to cloud metadata', () => {
            // Critical SSRF target that would have been bypassed
            expect(() => isDeniedIP('::ffff:169.254.169.254', TEST_DENY_LIST)).toThrow('Access to this host is denied by policy.')
        })
    })

    describe('IPv4-Mapped IPv6 CIDR in Deny List', () => {
        const mappedCIDRDenyList = [
            '::ffff:10.0.0.0/104', // Equivalent to 10.0.0.0/8
            '::ffff:127.0.0.0/104', // Equivalent to 127.0.0.0/8
            '::ffff:192.168.0.0/112' // Equivalent to 192.168.0.0/16
        ]

        it('should block IPv4 address matching IPv4-mapped IPv6 CIDR in deny list', () => {
            expect(() => isDeniedIP('10.5.5.5', mappedCIDRDenyList)).toThrow('Access to this host is denied by policy.')
            expect(() => isDeniedIP('127.0.0.1', mappedCIDRDenyList)).toThrow('Access to this host is denied by policy.')
            expect(() => isDeniedIP('192.168.1.1', mappedCIDRDenyList)).toThrow('Access to this host is denied by policy.')
        })

        it('should block IPv4-mapped IPv6 address matching IPv4-mapped IPv6 CIDR in deny list', () => {
            expect(() => isDeniedIP('::ffff:10.5.5.5', mappedCIDRDenyList)).toThrow('Access to this host is denied by policy.')
            expect(() => isDeniedIP('::ffff:127.0.0.1', mappedCIDRDenyList)).toThrow('Access to this host is denied by policy.')
            expect(() => isDeniedIP('::ffff:192.168.1.1', mappedCIDRDenyList)).toThrow('Access to this host is denied by policy.')
        })

        it('should allow IPv4 address outside IPv4-mapped IPv6 CIDR in deny list', () => {
            expect(() => isDeniedIP('8.8.8.8', mappedCIDRDenyList)).not.toThrow()
            expect(() => isDeniedIP('1.1.1.1', mappedCIDRDenyList)).not.toThrow()
        })

        it('should correctly match CIDR boundaries with IPv4-mapped IPv6 in deny list', () => {
            // Test edge cases for the mask adjustment logic
            expect(() => isDeniedIP('10.0.0.0', mappedCIDRDenyList)).toThrow('Access to this host is denied by policy.')
            expect(() => isDeniedIP('10.255.255.255', mappedCIDRDenyList)).toThrow('Access to this host is denied by policy.')
            expect(() => isDeniedIP('192.168.0.0', mappedCIDRDenyList)).toThrow('Access to this host is denied by policy.')
            expect(() => isDeniedIP('192.168.255.255', mappedCIDRDenyList)).toThrow('Access to this host is denied by policy.')
        })
    })

    describe('Non-Canonical IPv6 Address Matching', () => {
        it('should block IPv6 address when deny list has uppercase variant', () => {
            // Deny list has FE80::1 (uppercase), should still match fe80::1
            const denyListUppercase = ['FE80::1']
            expect(() => isDeniedIP('fe80::1', denyListUppercase)).toThrow('Access to this host is denied by policy.')
        })

        it('should block IPv6 address when deny list has leading zeros', () => {
            // Deny list has 2001:0DB8::1 (leading zeros), should still match 2001:db8::1
            const denyListLeadingZeros = ['2001:0DB8::1']
            expect(() => isDeniedIP('2001:db8::1', denyListLeadingZeros)).toThrow('Access to this host is denied by policy.')
        })

        it('should block canonical IPv6 when deny list has non-canonical form', () => {
            // Deny list has non-canonical form, canonical request should still be blocked
            const denyListNonCanonical = ['FE80:0000:0000:0000:0000:0000:0000:0001']
            expect(() => isDeniedIP('fe80::1', denyListNonCanonical)).toThrow('Access to this host is denied by policy.')
        })

        it('should block non-canonical IPv6 when deny list has canonical form', () => {
            // Deny list has canonical form, non-canonical request should still be blocked
            const denyListCanonical = ['fe80::1']
            expect(() => isDeniedIP('FE80::1', denyListCanonical)).toThrow('Access to this host is denied by policy.')
            expect(() => isDeniedIP('FE80:0000:0000:0000:0000:0000:0000:0001', denyListCanonical)).toThrow(
                'Access to this host is denied by policy.'
            )
        })

        it('should block IPv4-mapped IPv6 with mixed case in deny list', () => {
            // Deny list has ::FFFF:127.0.0.1 (uppercase), should match any variant
            const denyListMixedCase = ['::FFFF:127.0.0.1']
            expect(() => isDeniedIP('::ffff:127.0.0.1', denyListMixedCase)).toThrow('Access to this host is denied by policy.')
            expect(() => isDeniedIP('127.0.0.1', denyListMixedCase)).toThrow('Access to this host is denied by policy.')
        })

        it('should normalize both sides when deny list has non-canonical IPv4-mapped IPv6', () => {
            // Deny list has 0000:0000:0000:0000:0000:FFFF:7F00:0001 (non-canonical form of ::ffff:127.0.0.1)
            const denyListLongForm = ['0000:0000:0000:0000:0000:FFFF:7F00:0001']
            expect(() => isDeniedIP('::ffff:127.0.0.1', denyListLongForm)).toThrow('Access to this host is denied by policy.')
            expect(() => isDeniedIP('127.0.0.1', denyListLongForm)).toThrow('Access to this host is denied by policy.')
        })

        it('should allow IPv6 addresses that do not match despite normalization', () => {
            const denyListFe80 = ['FE80::1']
            expect(() => isDeniedIP('fe80::2', denyListFe80)).not.toThrow()
            expect(() => isDeniedIP('2001:4860:4860::8888', denyListFe80)).not.toThrow()
        })
    })

    describe('Malformed IPv4-Mapped IPv6 CIDR Handling', () => {
        it('should skip malformed IPv4-mapped IPv6 CIDR with mask < 96', () => {
            // ::ffff:10.0.0.0/64 would create negative adjustedMask (-32)
            const malformedList = ['::ffff:10.0.0.0/64']

            // Public IPs should NOT be blocked
            expect(() => isDeniedIP('8.8.8.8', malformedList)).not.toThrow()
            expect(() => isDeniedIP('1.1.1.1', malformedList)).not.toThrow()
        })

        it('should skip malformed entry but still check other valid entries', () => {
            // Mix malformed and valid entries
            const mixedList = [
                '::ffff:10.0.0.0/64', // Malformed - should be skipped
                '127.0.0.0/8' // Valid - should still work
            ]

            // Should block based on valid entry
            expect(() => isDeniedIP('127.0.0.1', mixedList)).toThrow('Access to this host is denied by policy.')

            // Should allow public IPs (malformed entry skipped)
            expect(() => isDeniedIP('8.8.8.8', mixedList)).not.toThrow()
        })

        it('should accept valid IPv4-mapped IPv6 CIDR with mask >= 96', () => {
            // Valid: mask = 104 >= 96, adjustedMask = 104 - 96 = 8
            const validList = ['::ffff:10.0.0.0/104']

            // Should block 10.x.x.x
            expect(() => isDeniedIP('10.5.5.5', validList)).toThrow('Access to this host is denied by policy.')

            // Should allow public IPs
            expect(() => isDeniedIP('8.8.8.8', validList)).not.toThrow()
        })

        it('should handle edge case: mask = 96 (exactly at boundary)', () => {
            // Valid: mask = 96, adjustedMask = 96 - 96 = 0 (matches all IPv4)
            const boundaryList = ['::ffff:0.0.0.0/96']

            // Should block all IPv4 (which is valid behavior for /96)
            expect(() => isDeniedIP('8.8.8.8', boundaryList)).toThrow('Access to this host is denied by policy.')
            expect(() => isDeniedIP('1.1.1.1', boundaryList)).toThrow('Access to this host is denied by policy.')
        })

        it('should skip multiple malformed entries', () => {
            // Multiple malformed entries
            const multiMalformedList = [
                '::ffff:10.0.0.0/64', // Malformed
                '::ffff:192.168.0.0/50', // Malformed
                '8.8.8.8' // Valid exact match
            ]

            // Should block exact match
            expect(() => isDeniedIP('8.8.8.8', multiMalformedList)).toThrow('Access to this host is denied by policy.')

            // Should allow other IPs (malformed entries skipped)
            expect(() => isDeniedIP('1.1.1.1', multiMalformedList)).not.toThrow()
            expect(() => isDeniedIP('10.0.0.1', multiMalformedList)).not.toThrow()
        })
    })
})

describe('secure redirect handling', () => {
    beforeEach(() => {
        mockedAxios.mockReset()
        mockedDnsLookup.mockReset()
        mockedFetch.mockReset()
        mockedDnsLookup.mockResolvedValue([{ address: '203.0.113.10', family: 4 }] as never)
    })

    it('removes credentials before a fetch follows a cross-origin redirect', async () => {
        mockedFetch
            .mockResolvedValueOnce(createFetchResponse(302, 'https://redirected.example/result'))
            .mockResolvedValueOnce(createFetchResponse(200))

        await secureFetch('https://source.example/start', {
            headers: {
                ...sensitiveHeaders,
                Accept: 'application/json'
            }
        })

        const redirectedInit = mockedFetch.mock.calls[1][1]
        const redirectedHeaders = new Headers(redirectedInit?.headers)
        expect(redirectedHeaders.get('authorization')).toBeNull()
        expect(redirectedHeaders.get('cookie')).toBeNull()
        expect(redirectedHeaders.get('host')).toBeNull()
        expect(redirectedHeaders.get('x-api-key')).toBeNull()
        expect(redirectedHeaders.get('accept')).toBe('application/json')
    })

    it('removes credentials before Axios follows a cross-origin redirect', async () => {
        mockedAxios
            .mockResolvedValueOnce(createAxiosResponse(302, 'https://redirected.example/result'))
            .mockResolvedValueOnce(createAxiosResponse(200))

        await secureAxiosRequest({
            url: 'https://source.example/start',
            headers: {
                ...sensitiveHeaders,
                Accept: 'application/json'
            }
        })

        const redirectedConfig = mockedAxios.mock.calls[1][0] as AxiosRequestConfig
        const redirectedHeaders = new Headers(redirectedConfig.headers as Record<string, string>)
        expect(redirectedHeaders.get('authorization')).toBeNull()
        expect(redirectedHeaders.get('cookie')).toBeNull()
        expect(redirectedHeaders.get('host')).toBe('redirected.example')
        expect(redirectedHeaders.get('x-api-key')).toBeNull()
        expect(redirectedHeaders.get('accept')).toBe('application/json')
    })

    it('keeps credentials on same-origin redirects', async () => {
        mockedFetch.mockResolvedValueOnce(createFetchResponse(302, '/result')).mockResolvedValueOnce(createFetchResponse(200))

        await secureFetch('https://source.example/start', {
            headers: sensitiveHeaders
        })

        const redirectedHeaders = new Headers(mockedFetch.mock.calls[1][1]?.headers)
        expect(redirectedHeaders.get('authorization')).toBe('Bearer secret')
        expect(redirectedHeaders.get('cookie')).toBe('session=secret')
        expect(redirectedHeaders.get('host')).toBe('source.example')
        expect(redirectedHeaders.get('x-api-key')).toBe('secret-key')
    })

    it('removes entity headers when a redirect changes POST to GET', async () => {
        mockedFetch.mockResolvedValueOnce(createFetchResponse(303, '/result')).mockResolvedValueOnce(createFetchResponse(200))

        await secureFetch('https://source.example/start', {
            method: 'POST',
            body: '{"query":"value"}',
            headers: {
                'Content-Length': '17',
                'Content-Encoding': 'gzip',
                'Content-Type': 'application/json',
                'X-Request-Id': 'request-1'
            }
        })

        const redirectedInit = mockedFetch.mock.calls[1][1]
        const redirectedHeaders = new Headers(redirectedInit?.headers)
        expect(redirectedInit?.method).toBe('GET')
        expect(redirectedInit?.body).toBeUndefined()
        expect(redirectedHeaders.get('content-encoding')).toBeNull()
        expect(redirectedHeaders.get('content-length')).toBeNull()
        expect(redirectedHeaders.get('content-type')).toBeNull()
        expect(redirectedHeaders.get('x-request-id')).toBe('request-1')
    })

    it('removes Axios entity headers when a redirect changes POST to GET', async () => {
        mockedAxios.mockResolvedValueOnce(createAxiosResponse(303, '/result')).mockResolvedValueOnce(createAxiosResponse(200))

        await secureAxiosRequest({
            url: 'https://source.example/start',
            method: 'POST',
            data: '{"query":"value"}',
            headers: {
                'Content-Length': '17',
                'Content-Encoding': 'gzip',
                'Content-Type': 'application/json',
                'X-Request-Id': 'request-1'
            }
        })

        const redirectedConfig = mockedAxios.mock.calls[1][0] as AxiosRequestConfig
        const redirectedHeaders = new Headers(redirectedConfig.headers as Record<string, string>)
        expect(redirectedConfig.method).toBe('GET')
        expect(redirectedConfig.data).toBeUndefined()
        expect(redirectedHeaders.get('content-encoding')).toBeNull()
        expect(redirectedHeaders.get('content-length')).toBeNull()
        expect(redirectedHeaders.get('content-type')).toBeNull()
        expect(redirectedHeaders.get('x-request-id')).toBe('request-1')
    })
})

function createFetchResponse(status: number, location?: string): Response {
    return {
        status,
        headers: new Headers(location ? { location } : {})
    } as Response
}

function createAxiosResponse(status: number, location?: string): Awaited<ReturnType<typeof axios>> {
    return {
        status,
        headers: location ? { location } : {}
    } as Awaited<ReturnType<typeof axios>>
}
