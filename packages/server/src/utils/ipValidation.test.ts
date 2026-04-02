import { describe, expect, it } from '@jest/globals'
import { isIPv4, isIPv6, isValidIPAddress } from './ipValidation'

describe('IP Address Validation Utilities', () => {
    describe('isValidIPAddress', () => {
        describe('Valid IPv4 addresses', () => {
            it('should return true for standard IPv4 address', () => {
                expect(isValidIPAddress('192.168.1.1')).toBe(true)
            })

            it('should return true for localhost IPv4', () => {
                expect(isValidIPAddress('127.0.0.1')).toBe(true)
            })

            it('should return true for 0.0.0.0', () => {
                expect(isValidIPAddress('0.0.0.0')).toBe(true)
            })

            it('should return true for 255.255.255.255', () => {
                expect(isValidIPAddress('255.255.255.255')).toBe(true)
            })

            it('should return true for public IPv4', () => {
                expect(isValidIPAddress('8.8.8.8')).toBe(true)
            })

            it('should return true for private IPv4 (10.x.x.x)', () => {
                expect(isValidIPAddress('10.0.0.1')).toBe(true)
            })

            it('should return true for private IPv4 (172.16.x.x)', () => {
                expect(isValidIPAddress('172.16.0.1')).toBe(true)
            })

            it('should return true for private IPv4 (192.168.x.x)', () => {
                expect(isValidIPAddress('192.168.0.1')).toBe(true)
            })
        })

        describe('Valid IPv6 addresses', () => {
            it('should return true for full IPv6 address', () => {
                expect(isValidIPAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true)
            })

            it('should return true for compressed IPv6 address', () => {
                expect(isValidIPAddress('2001:db8:85a3::8a2e:370:7334')).toBe(true)
            })

            it('should return true for IPv6 localhost (::1)', () => {
                expect(isValidIPAddress('::1')).toBe(true)
            })

            it('should return true for IPv6 unspecified address (::)', () => {
                expect(isValidIPAddress('::')).toBe(true)
            })

            it('should return true for IPv6 with zeros compressed', () => {
                expect(isValidIPAddress('fe80::1')).toBe(true)
            })

            it('should return true for IPv6 link-local address', () => {
                expect(isValidIPAddress('fe80::a00:27ff:fe4e:66a1')).toBe(true)
            })

            it('should return true for IPv4-mapped IPv6 address', () => {
                expect(isValidIPAddress('::ffff:192.168.1.1')).toBe(true)
            })
        })

        describe('Invalid IP addresses', () => {
            it('should return false for empty string', () => {
                expect(isValidIPAddress('')).toBe(false)
            })

            it('should return false for undefined', () => {
                expect(isValidIPAddress(undefined as any)).toBe(false)
            })

            it('should return false for null', () => {
                expect(isValidIPAddress(null as any)).toBe(false)
            })

            it('should return false for non-string input', () => {
                expect(isValidIPAddress(123 as any)).toBe(false)
            })

            it('should return false for invalid IPv4 (too many octets)', () => {
                expect(isValidIPAddress('192.168.1.1.1')).toBe(false)
            })

            it('should return false for invalid IPv4 (octet > 255)', () => {
                expect(isValidIPAddress('192.168.256.1')).toBe(false)
            })

            it('should return false for invalid IPv4 (negative octet)', () => {
                expect(isValidIPAddress('192.168.-1.1')).toBe(false)
            })

            it('should return false for invalid IPv4 (too few octets)', () => {
                expect(isValidIPAddress('192.168.1')).toBe(false)
            })

            it('should return false for hostname', () => {
                expect(isValidIPAddress('example.com')).toBe(false)
            })

            it('should return false for URL', () => {
                expect(isValidIPAddress('http://192.168.1.1')).toBe(false)
            })

            it('should return false for invalid IPv6 (too many segments)', () => {
                expect(isValidIPAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334:extra')).toBe(false)
            })

            it('should return false for malformed IPv6', () => {
                expect(isValidIPAddress('gggg::1')).toBe(false)
            })

            it('should return false for random string', () => {
                expect(isValidIPAddress('not-an-ip')).toBe(false)
            })
        })
    })

    describe('isIPv4', () => {
        describe('Valid IPv4 addresses', () => {
            it('should return true for standard IPv4 address', () => {
                expect(isIPv4('192.168.1.1')).toBe(true)
            })

            it('should return true for localhost IPv4', () => {
                expect(isIPv4('127.0.0.1')).toBe(true)
            })

            it('should return true for 0.0.0.0', () => {
                expect(isIPv4('0.0.0.0')).toBe(true)
            })

            it('should return true for 255.255.255.255', () => {
                expect(isIPv4('255.255.255.255')).toBe(true)
            })

            it('should return true for public IPv4 (8.8.8.8)', () => {
                expect(isIPv4('8.8.8.8')).toBe(true)
            })

            it('should return true for public IPv4 (1.1.1.1)', () => {
                expect(isIPv4('1.1.1.1')).toBe(true)
            })
        })

        describe('Invalid or non-IPv4 addresses', () => {
            it('should return false for IPv6 address', () => {
                expect(isIPv4('2001:db8:85a3::8a2e:370:7334')).toBe(false)
            })

            it('should return false for IPv6 localhost', () => {
                expect(isIPv4('::1')).toBe(false)
            })

            it('should return false for IPv4-mapped IPv6 address', () => {
                expect(isIPv4('::ffff:192.168.1.1')).toBe(false)
            })

            it('should return false for invalid IPv4', () => {
                expect(isIPv4('192.168.256.1')).toBe(false)
            })

            it('should return false for empty string', () => {
                expect(isIPv4('')).toBe(false)
            })

            it('should return false for hostname', () => {
                expect(isIPv4('example.com')).toBe(false)
            })
        })
    })

    describe('isIPv6', () => {
        describe('Valid IPv6 addresses', () => {
            it('should return true for full IPv6 address', () => {
                expect(isIPv6('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true)
            })

            it('should return true for compressed IPv6 address', () => {
                expect(isIPv6('2001:db8:85a3::8a2e:370:7334')).toBe(true)
            })

            it('should return true for IPv6 localhost (::1)', () => {
                expect(isIPv6('::1')).toBe(true)
            })

            it('should return true for IPv6 unspecified address (::)', () => {
                expect(isIPv6('::')).toBe(true)
            })

            it('should return true for link-local IPv6', () => {
                expect(isIPv6('fe80::1')).toBe(true)
            })

            it('should return true for IPv4-mapped IPv6 address', () => {
                expect(isIPv6('::ffff:192.168.1.1')).toBe(true)
            })

            it('should return true for global unicast IPv6', () => {
                expect(isIPv6('2607:f8b0:4005:805::200e')).toBe(true)
            })
        })

        describe('Invalid or non-IPv6 addresses', () => {
            it('should return false for IPv4 address', () => {
                expect(isIPv6('192.168.1.1')).toBe(false)
            })

            it('should return false for IPv4 localhost', () => {
                expect(isIPv6('127.0.0.1')).toBe(false)
            })

            it('should return false for invalid IPv6', () => {
                expect(isIPv6('gggg::1')).toBe(false)
            })

            it('should return false for empty string', () => {
                expect(isIPv6('')).toBe(false)
            })

            it('should return false for hostname', () => {
                expect(isIPv6('example.com')).toBe(false)
            })

            it('should return false for malformed IPv6', () => {
                expect(isIPv6('2001:0db8:85a3:0000:0000:8a2e:0370:7334:extra')).toBe(false)
            })
        })
    })

    describe('Edge cases and security considerations', () => {
        it('isValidIPAddress should handle whitespace-trimmed input', () => {
            // Note: Node's isIP doesn't auto-trim, so these should fail
            expect(isValidIPAddress(' 192.168.1.1 ')).toBe(false)
        })

        it('isValidIPAddress should reject IP with port number', () => {
            expect(isValidIPAddress('192.168.1.1:8080')).toBe(false)
        })

        it('isIPv4 should reject IPv4 with CIDR notation', () => {
            expect(isIPv4('192.168.1.0/24')).toBe(false)
        })

        it('isIPv6 should reject IPv6 with CIDR notation', () => {
            expect(isIPv6('2001:db8::/32')).toBe(false)
        })

        it('should handle special IPv4 addresses correctly', () => {
            expect(isIPv4('169.254.0.1')).toBe(true) // Link-local
            expect(isIPv4('224.0.0.1')).toBe(true) // Multicast
            expect(isIPv4('255.255.255.255')).toBe(true) // Broadcast
        })

        it('should handle special IPv6 addresses correctly', () => {
            expect(isIPv6('ff02::1')).toBe(true) // Multicast
            expect(isIPv6('fc00::1')).toBe(true) // Unique local address
        })
    })

    describe('Type safety', () => {
        it('should handle various falsy values gracefully', () => {
            expect(isValidIPAddress('' as string)).toBe(false)
            expect(isValidIPAddress(null as any)).toBe(false)
            expect(isValidIPAddress(undefined as any)).toBe(false)
        })

        it('should handle non-string types gracefully', () => {
            expect(isValidIPAddress(123 as any)).toBe(false)
            expect(isValidIPAddress({} as any)).toBe(false)
            expect(isValidIPAddress([] as any)).toBe(false)
        })
    })
})
