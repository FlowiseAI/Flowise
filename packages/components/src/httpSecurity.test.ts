import { describe, expect, it } from '@jest/globals'
import { isDeniedIP } from './httpSecurity'

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
})
