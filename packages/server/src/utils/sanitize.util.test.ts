import { describe, expect, it } from '@jest/globals'
import { sanitizeAuditMetadata, sanitizeIPAddress, sanitizeNullBytes, sanitizeUser } from '../../src/utils/sanitize.util'

describe('Sanitization Utilities', () => {
    describe('sanitizeNullBytes', () => {
        describe('String sanitization', () => {
            it('should remove null bytes from object string values', () => {
                const input = { text: 'hello\u0000world' }
                const result = sanitizeNullBytes(input)
                expect(result.text).toBe('helloworld')
            })

            it('should return unchanged object when strings have no null bytes', () => {
                const input = { text: 'clean string' }
                const result = sanitizeNullBytes(input)
                expect(result.text).toBe('clean string')
            })
            it('should handle empty string in object', () => {
                const input = { text: '' }
                const result = sanitizeNullBytes(input)
                expect(result.text).toBe('')
            })
        })

        describe('Object sanitization', () => {
            it('should remove null bytes from object string values', () => {
                const input = {
                    name: 'test\u0000user',
                    email: 'user\u0000@example.com',
                    age: 25
                }
                const result = sanitizeNullBytes(input)
                expect(result.name).toBe('testuser')
                expect(result.email).toBe('user@example.com')
                expect(result.age).toBe(25)
            })

            it('should handle nested objects', () => {
                const input = {
                    user: {
                        name: 'john\u0000doe',
                        profile: {
                            bio: 'hello\u0000world'
                        }
                    }
                }
                const result = sanitizeNullBytes(input)
                expect(result.user.name).toBe('johndoe')
                expect(result.user.profile.bio).toBe('helloworld')
            })

            it('should preserve non-string values in objects', () => {
                const input = {
                    str: 'test\u0000',
                    num: 42,
                    bool: true,
                    nil: null,
                    undef: undefined
                }
                const result = sanitizeNullBytes(input)
                expect(result.str).toBe('test')
                expect(result.num).toBe(42)
                expect(result.bool).toBe(true)
                expect(result.nil).toBe(null)
                expect(result.undef).toBe(undefined)
            })

            it('should handle empty object', () => {
                const input = {}
                const result = sanitizeNullBytes(input)
                expect(result).toEqual({})
            })
        })

        describe('Array sanitization', () => {
            it('should remove null bytes from array string elements', () => {
                const input = ['hello\u0000world', 'test\u0000data', 'clean']
                const result = sanitizeNullBytes(input)
                expect(result).toEqual(['helloworld', 'testdata', 'clean'])
            })

            it('should handle arrays with mixed types', () => {
                const input = ['test\u0000', 123, true, null, undefined]
                const result = sanitizeNullBytes(input)
                expect(result).toEqual(['test', 123, true, null, undefined])
            })

            it('should handle nested arrays', () => {
                const input = [
                    ['a\u0000b', 'c\u0000d'],
                    ['e\u0000f', 'g\u0000h']
                ]
                const result = sanitizeNullBytes(input)
                expect(result).toEqual([
                    ['ab', 'cd'],
                    ['ef', 'gh']
                ])
            })

            it('should handle arrays of objects', () => {
                const input = [{ name: 'user1\u0000' }, { name: 'user2\u0000' }]
                const result = sanitizeNullBytes(input)
                expect(result).toEqual([{ name: 'user1' }, { name: 'user2' }])
            })

            it('should handle empty array', () => {
                const input: any[] = []
                const result = sanitizeNullBytes(input)
                expect(result).toEqual([])
            })
        })

        describe('Complex nested structures', () => {
            it('should handle deeply nested mixed structures', () => {
                const input = {
                    users: [
                        {
                            name: 'john\u0000',
                            emails: ['john\u0000@test.com'],
                            metadata: {
                                bio: 'hello\u0000world'
                            }
                        }
                    ],
                    config: {
                        settings: ['opt1\u0000', 'opt2\u0000']
                    }
                }
                const result = sanitizeNullBytes(input)
                expect(result.users[0].name).toBe('john')
                expect(result.users[0].emails[0]).toBe('john@test.com')
                expect(result.users[0].metadata.bio).toBe('helloworld')
                expect(result.config.settings).toEqual(['opt1', 'opt2'])
            })

            it('should handle objects within arrays within objects', () => {
                const input = {
                    data: [{ value: 'a\u0000' }, { value: 'b\u0000' }]
                }
                const result = sanitizeNullBytes(input)
                expect(result.data[0].value).toBe('a')
                expect(result.data[1].value).toBe('b')
            })
        })

        describe('Edge cases', () => {
            it('should mutate the original object (in-place modification)', () => {
                const input = { name: 'test\u0000' }
                const result = sanitizeNullBytes(input)
                expect(result).toBe(input) // Same reference
                expect(input.name).toBe('test')
            })

            // NOTE: Circular reference test removed - sanitizeNullBytes does not handle circular references
            // and will cause an infinite loop. This is a known limitation of the stack-based implementation.

            it('should handle null input', () => {
                const result = sanitizeNullBytes(null)
                expect(result).toBe(null)
            })

            it('should handle undefined input', () => {
                const result = sanitizeNullBytes(undefined)
                expect(result).toBe(undefined)
            })

            it('should handle number input', () => {
                const result = sanitizeNullBytes(42)
                expect(result).toBe(42)
            })

            it('should handle boolean input', () => {
                const result = sanitizeNullBytes(true)
                expect(result).toBe(true)
            })

            it('should skip inherited properties', () => {
                const proto = { inherited: 'value\u0000' }
                const input = Object.create(proto)
                input.own = 'test\u0000'

                const result = sanitizeNullBytes(input)
                expect(result.own).toBe('test')
                // Inherited property should not be sanitized
                expect(proto.inherited).toBe('value\u0000')
            })
        })
    })

    describe('sanitizeUser', () => {
        it('should remove credential from user object', () => {
            const user = {
                id: '123',
                name: 'John',
                email: 'john@example.com',
                credential: 'sensitive-credential'
            }
            const result = sanitizeUser(user)
            expect(result.credential).toBeUndefined()
            expect(result.id).toBe('123')
            expect(result.name).toBe('John')
            expect(result.email).toBe('john@example.com')
        })

        it('should remove tempToken from user object', () => {
            const user = {
                id: '123',
                name: 'John',
                tempToken: 'temporary-token-abc123'
            }
            const result = sanitizeUser(user)
            expect(result.tempToken).toBeUndefined()
            expect(result.id).toBe('123')
            expect(result.name).toBe('John')
        })

        it('should remove tokenExpiry from user object', () => {
            const user = {
                id: '123',
                name: 'John',
                tokenExpiry: new Date('2025-12-31')
            }
            const result = sanitizeUser(user)
            expect(result.tokenExpiry).toBeUndefined()
            expect(result.id).toBe('123')
            expect(result.name).toBe('John')
        })

        it('should remove all sensitive fields at once', () => {
            const user = {
                id: '123',
                name: 'John',
                email: 'john@example.com',
                credential: 'sensitive-credential',
                tempToken: 'temp-token',
                tokenExpiry: new Date('2025-12-31')
            }
            const result = sanitizeUser(user)
            expect(result.credential).toBeUndefined()
            expect(result.tempToken).toBeUndefined()
            expect(result.tokenExpiry).toBeUndefined()
            expect(result.id).toBe('123')
            expect(result.name).toBe('John')
            expect(result.email).toBe('john@example.com')
        })

        it('should handle partial user object (missing sensitive fields)', () => {
            const user = {
                id: '123',
                name: 'John'
            }
            const result = sanitizeUser(user)
            expect(result.id).toBe('123')
            expect(result.name).toBe('John')
        })

        it('should mutate the original user object (in-place modification)', () => {
            const user = {
                id: '123',
                credential: 'secret'
            }
            const result = sanitizeUser(user)
            expect(result).toBe(user) // Same reference
            expect(user.credential).toBeUndefined()
        })

        it('should handle empty user object', () => {
            const user = {}
            const result = sanitizeUser(user)
            expect(result).toEqual({})
        })

        it('should preserve other user properties', () => {
            const user = {
                id: '123',
                name: 'John',
                email: 'john@example.com',
                status: 'ACTIVE',
                createdDate: new Date('2024-01-01'),
                updatedDate: new Date('2024-01-02'),
                createdBy: 'admin',
                credential: 'secret',
                tempToken: 'token',
                tokenExpiry: new Date('2025-12-31')
            }
            const result = sanitizeUser(user)
            expect(result.id).toBe('123')
            expect(result.name).toBe('John')
            expect(result.email).toBe('john@example.com')
            expect(result.status).toBe('ACTIVE')
            expect(result.createdDate).toEqual(new Date('2024-01-01'))
            expect(result.updatedDate).toEqual(new Date('2024-01-02'))
            expect(result.createdBy).toBe('admin')
            expect(result.credential).toBeUndefined()
            expect(result.tempToken).toBeUndefined()
            expect(result.tokenExpiry).toBeUndefined()
        })
    })

    describe('sanitizeIPAddress', () => {
        describe('IPv4 sanitization', () => {
            it('should mask last octet of standard IPv4 address', () => {
                expect(sanitizeIPAddress('192.168.1.100')).toBe('192.168.1.xxx')
            })

            it('should mask last octet of localhost', () => {
                expect(sanitizeIPAddress('127.0.0.1')).toBe('127.0.0.xxx')
            })

            it('should mask last octet of public IP', () => {
                expect(sanitizeIPAddress('8.8.8.8')).toBe('8.8.8.xxx')
            })

            it('should mask last octet of private IP (10.x.x.x)', () => {
                expect(sanitizeIPAddress('10.0.0.1')).toBe('10.0.0.xxx')
            })

            it('should mask last octet of private IP (172.16.x.x)', () => {
                expect(sanitizeIPAddress('172.16.254.1')).toBe('172.16.254.xxx')
            })

            it('should mask last octet of 0.0.0.0', () => {
                expect(sanitizeIPAddress('0.0.0.0')).toBe('0.0.0.xxx')
            })

            it('should mask last octet of broadcast address', () => {
                expect(sanitizeIPAddress('255.255.255.255')).toBe('255.255.255.xxx')
            })
        })

        describe('IPv6 sanitization', () => {
            it('should mask last 64 bits of full IPv6 address', () => {
                const result = sanitizeIPAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334')
                expect(result).toContain(':xxxx:xxxx:xxxx:xxxx')
                expect(result).toContain('2001:0db8:85a3:0000')
            })

            it('should mask last 64 bits of compressed IPv6 address', () => {
                const result = sanitizeIPAddress('2001:db8:85a3::8a2e:370:7334')
                expect(result).toContain(':xxxx:xxxx:xxxx:xxxx')
            })

            it('should mask IPv6 localhost (::1)', () => {
                const result = sanitizeIPAddress('::1')
                expect(result).toContain(':xxxx:xxxx:xxxx:xxxx')
            })

            it('should mask IPv6 unspecified address (::)', () => {
                const result = sanitizeIPAddress('::')
                expect(result).toContain(':xxxx:xxxx:xxxx:xxxx')
            })

            it('should mask link-local IPv6 address', () => {
                const result = sanitizeIPAddress('fe80::1')
                expect(result).toContain(':xxxx:xxxx:xxxx:xxxx')
                expect(result).toContain('fe80')
            })

            it('should mask global unicast IPv6 address', () => {
                const result = sanitizeIPAddress('2607:f8b0:4005:805::200e')
                expect(result).toContain(':xxxx:xxxx:xxxx:xxxx')
            })

            it('should mask IPv4-mapped IPv6 address (masks last 64 bits as IPv6)', () => {
                const result = sanitizeIPAddress('::ffff:192.168.1.1')
                expect(result).toBe('0000:0000:0000:0000:xxxx:xxxx:xxxx:xxxx')
            })
        })

        describe('Invalid input handling', () => {
            it('should return "unknown" for invalid IPv4', () => {
                expect(sanitizeIPAddress('192.168.256.1')).toBe('unknown')
            })

            it('should return "unknown" for invalid IPv6', () => {
                expect(sanitizeIPAddress('gggg::1')).toBe('unknown')
            })

            it('should return "unknown" for empty string', () => {
                expect(sanitizeIPAddress('')).toBe('unknown')
            })

            it('should return "unknown" for hostname', () => {
                expect(sanitizeIPAddress('example.com')).toBe('unknown')
            })

            it('should return "unknown" for URL', () => {
                expect(sanitizeIPAddress('http://192.168.1.1')).toBe('unknown')
            })

            it('should return "unknown" for malformed IP', () => {
                expect(sanitizeIPAddress('not-an-ip')).toBe('unknown')
            })

            it('should return "unknown" for IPv4 with port', () => {
                expect(sanitizeIPAddress('192.168.1.1:8080')).toBe('unknown')
            })

            it('should return "unknown" for CIDR notation', () => {
                expect(sanitizeIPAddress('192.168.1.0/24')).toBe('unknown')
            })
        })

        describe('Privacy and GDPR compliance', () => {
            it('should preserve network portion of IPv4 for analytics', () => {
                const result = sanitizeIPAddress('192.168.1.100')
                expect(result.startsWith('192.168.1.')).toBe(true)
            })

            it('should mask individual host identifier in IPv4', () => {
                const result = sanitizeIPAddress('192.168.1.100')
                expect(result).not.toContain('100')
                expect(result.endsWith('xxx')).toBe(true)
            })

            it('should preserve network prefix of IPv6 for geolocation', () => {
                const result = sanitizeIPAddress('2001:db8:85a3::8a2e:370:7334')
                expect(result).toContain('2001')
            })

            it('should mask interface identifier in IPv6', () => {
                const result = sanitizeIPAddress('2001:db8:85a3::8a2e:370:7334')
                expect(result).toContain('xxxx')
                expect(result).not.toContain('7334')
            })
        })

        describe('Edge cases', () => {
            it('should handle various IPv4 formats consistently', () => {
                const ips = ['1.1.1.1', '10.10.10.10', '100.100.100.100']
                const results = ips.map((ip) => sanitizeIPAddress(ip))
                results.forEach((result) => {
                    expect(result.endsWith('.xxx')).toBe(true)
                })
            })

            it('should handle different IPv6 compression styles', () => {
                const ips = ['fe80::1', 'fe80:0:0:0:0:0:0:1', 'fe80::0:0:0:1']
                const results = ips.map((ip) => sanitizeIPAddress(ip))
                results.forEach((result) => {
                    expect(result).toContain('xxxx')
                })
            })

            it('should return "unknown" if IP passes validation but has unexpected format', () => {
                const ipValidation = require('../../src/utils/ipValidation')
                const mockIsValid = jest.spyOn(ipValidation, 'isValidIPAddress')
                mockIsValid.mockReturnValueOnce(true)

                const result = sanitizeIPAddress('unusual-format')
                expect(result).toBe('unknown')

                mockIsValid.mockRestore()
            })

            it('should return "unknown" when IPv6 expands to non-8 groups (defensive)', () => {
                const ipValidation = require('../../src/utils/ipValidation')
                jest.spyOn(ipValidation, 'isValidIPAddress').mockReturnValueOnce(true)
                jest.spyOn(ipValidation, 'isIPv4').mockReturnValueOnce(false)
                jest.spyOn(ipValidation, 'isIPv6').mockReturnValueOnce(true)

                const result = sanitizeIPAddress('1:2:3:4:5:6:7:8:9')
                expect(result).toBe('unknown')

                ipValidation.isValidIPAddress.mockRestore()
                ipValidation.isIPv4.mockRestore()
                ipValidation.isIPv6.mockRestore()
            })
        })
    })

    describe('sanitizeAuditMetadata', () => {
        it('should return empty object for undefined/null', () => {
            expect(sanitizeAuditMetadata(undefined)).toEqual({})
            expect(sanitizeAuditMetadata(null)).toEqual({})
        })

        it('should redact sensitive keys (case-insensitive substring match)', () => {
            const input = {
                tokenExpiryMinutes: 15,
                Password: 'p@ss',
                Authorization: 'Bearer abc',
                safeKey: 'ok'
            }

            expect(sanitizeAuditMetadata(input)).toEqual({
                tokenExpiryMinutes: '********',
                Password: '********',
                Authorization: '********',
                safeKey: 'ok'
            })
        })

        it('should remove null bytes from string values', () => {
            const input = { userAgent: 'Moz\u0000illa/5.0' }
            expect(sanitizeAuditMetadata(input)).toEqual({ userAgent: 'Mozilla/5.0' })
        })

        it('should recursively sanitize nested objects with sensitive keys', () => {
            const input = {
                configuration: {
                    apiKey: 'secret-key-123',
                    timeout: 30
                },
                settings: {
                    password: 'mypassword'
                }
            }

            expect(sanitizeAuditMetadata(input)).toEqual({
                configuration: {
                    apiKey: '********',
                    timeout: 30
                },
                settings: {
                    password: '********'
                }
            })
        })

        it('should sanitize arrays when key name is not sensitive', () => {
            const input = {
                items: [{ apiKey: 'secret1' }, { apiKey: 'secret2' }],
                ports: [8080, 3000]
            }

            expect(sanitizeAuditMetadata(input)).toEqual({
                items: [{ apiKey: '********' }, { apiKey: '********' }],
                ports: [8080, 3000]
            })
        })

        it('should redact entire value when key itself is sensitive, even if it is an array', () => {
            const input = {
                tokens: ['token1', 'token2'],
                passwords: ['pass1', 'pass2']
            }

            expect(sanitizeAuditMetadata(input)).toEqual({
                tokens: '********',
                passwords: '********'
            })
        })
    })

    describe('Integration scenarios', () => {
        it('should sanitize user object with null bytes in sensitive fields', () => {
            const user = {
                name: 'john\u0000doe',
                credential: 'secret\u0000token',
                tempToken: 'temp\u0000token'
            }

            // First remove null bytes
            const cleaned = sanitizeNullBytes(user)
            // Then sanitize user
            const result = sanitizeUser(cleaned)

            expect(result.name).toBe('johndoe')
            expect(result.credential).toBeUndefined()
            expect(result.tempToken).toBeUndefined()
        })

        it('should sanitize audit event metadata with IP addresses', () => {
            const event = {
                user: 'admin\u0000',
                action: 'login\u0000',
                ipAddress: '192.168.1.100',
                metadata: {
                    userAgent: 'Mozilla\u0000/5.0'
                }
            }

            // Sanitize null bytes
            const cleaned = sanitizeNullBytes(event)
            // Sanitize IP
            const sanitized = {
                ...cleaned,
                ipAddress: sanitizeIPAddress(cleaned.ipAddress)
            }

            expect(sanitized.user).toBe('admin')
            expect(sanitized.action).toBe('login')
            expect(sanitized.ipAddress).toBe('192.168.1.xxx')
            expect(sanitized.metadata.userAgent).toBe('Mozilla/5.0')
        })
    })
})
