import { X402PaymentTool } from './core'

describe('X402PaymentTool - accepts[] Parser', () => {
    describe('parsePaymentRequired - V2 format with accepts[]', () => {
        it('should parse decimal-style maxAmountRequired correctly', () => {
            const tool = new X402PaymentTool({
                url: 'https://api.example.com/endpoint',
                network: 'solana',
                privateKey: 'base64key'
            })

            const body = {
                accepts: [
                    {
                        scheme: 'solana',
                        maxAmountRequired: '0.001',
                        network: 'solana:mainnet',
                        payTo: 'TestRecipientAddress',
                        extra: {
                            decimals: 6,
                            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
                        }
                    }
                ]
            }

            const result = tool['parsePaymentRequired'](body, 'solana')

            expect(result.maxAmountRequired).toBe('1000') // 0.001 * 10^6 = 1000 atomic units
            expect(result.decimals).toBe(6)
            expect(result.network).toBe('solana')
            expect(result.asset).toBe('epjfwwdd5aufqssqem2qn1xzybapc8g4weggkzwytdt1v')
            expect(result.payTo).toBe('TestRecipientAddress')
            expect(result.scheme).toBe('solana')
        })

        it('should parse atomic-style amount correctly (no conversion)', () => {
            const tool = new X402PaymentTool({
                url: 'https://api.example.com/endpoint',
                network: 'solana',
                privateKey: 'base64key'
            })

            const body = {
                accepts: [
                    {
                        scheme: 'solana',
                        amount: '1000',
                        network: 'solana:mainnet',
                        payTo: 'TestRecipientAddress',
                        extra: {
                            decimals: 6,
                            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
                        }
                    }
                ]
            }

            const result = tool['parsePaymentRequired'](body, 'solana')

            expect(result.maxAmountRequired).toBe('1000') // Already atomic, no conversion
            expect(result.decimals).toBe(6)
            expect(result.network).toBe('solana')
        })

        it('should parse legacy price field correctly (treated as decimal)', () => {
            const tool = new X402PaymentTool({
                url: 'https://api.example.com/endpoint',
                network: 'base',
                privateKey: 'privatekey'
            })

            const body = {
                accepts: [
                    {
                        scheme: 'eip3009',
                        price: '0.000001',
                        network: 'eip155:8453',
                        payTo: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
                        extra: {
                            decimals: 6,
                            mint: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
                        }
                    }
                ]
            }

            const result = tool['parsePaymentRequired'](body, 'base')

            expect(result.maxAmountRequired).toBe('1') // 0.000001 * 10^6 = 1 atomic unit
            expect(result.decimals).toBe(6)
            expect(result.network).toBe('base')
        })

        it('should prioritize maxAmountRequired over amount and price', () => {
            const tool = new X402PaymentTool({
                url: 'https://api.example.com/endpoint',
                network: 'solana',
                privateKey: 'base64key'
            })

            const body = {
                accepts: [
                    {
                        scheme: 'solana',
                        maxAmountRequired: '0.001',
                        amount: '9999',
                        price: '0.002',
                        network: 'solana:mainnet',
                        payTo: 'TestRecipientAddress',
                        extra: {
                            decimals: 6,
                            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
                        }
                    }
                ]
            }

            const result = tool['parsePaymentRequired'](body, 'solana')

            expect(result.maxAmountRequired).toBe('1000') // Should use maxAmountRequired (0.001 * 10^6)
        })

        it('should prioritize amount over price when maxAmountRequired is missing', () => {
            const tool = new X402PaymentTool({
                url: 'https://api.example.com/endpoint',
                network: 'solana',
                privateKey: 'base64key'
            })

            const body = {
                accepts: [
                    {
                        scheme: 'solana',
                        amount: '5000',
                        price: '0.002',
                        network: 'solana:mainnet',
                        payTo: 'TestRecipientAddress',
                        extra: {
                            decimals: 6,
                            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
                        }
                    }
                ]
            }

            const result = tool['parsePaymentRequired'](body, 'solana')

            expect(result.maxAmountRequired).toBe('5000') // Should use amount directly
        })

        it('should fall back to price when both maxAmountRequired and amount are missing', () => {
            const tool = new X402PaymentTool({
                url: 'https://api.example.com/endpoint',
                network: 'solana',
                privateKey: 'base64key'
            })

            const body = {
                accepts: [
                    {
                        scheme: 'solana',
                        price: '0.000005',
                        network: 'solana:mainnet',
                        payTo: 'TestRecipientAddress',
                        extra: {
                            decimals: 6,
                            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
                        }
                    }
                ]
            }

            const result = tool['parsePaymentRequired'](body, 'solana')

            expect(result.maxAmountRequired).toBe('5') // Should use price (0.000005 * 10^6)
        })

        it('should throw error when no amount field is present', () => {
            const tool = new X402PaymentTool({
                url: 'https://api.example.com/endpoint',
                network: 'solana',
                privateKey: 'base64key'
            })

            const body = {
                accepts: [
                    {
                        scheme: 'solana',
                        network: 'solana:mainnet',
                        payTo: 'TestRecipientAddress',
                        extra: {
                            decimals: 6,
                            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
                        }
                    }
                ]
            }

            expect(() => {
                tool['parsePaymentRequired'](body, 'solana')
            }).toThrow('No amount field found in accepts[] entry')
        })

        it('should handle different decimal values correctly', () => {
            const tool = new X402PaymentTool({
                url: 'https://api.example.com/endpoint',
                network: 'solana',
                privateKey: 'base64key'
            })

            const testCases = [
                { maxAmountRequired: '1.0', expected: '1000000' },
                { maxAmountRequired: '0.1', expected: '100000' },
                { maxAmountRequired: '0.01', expected: '10000' },
                { maxAmountRequired: '0.000001', expected: '1' },
                { maxAmountRequired: '123.456789', expected: '123456789' }
            ]

            testCases.forEach(({ maxAmountRequired, expected }) => {
                const body = {
                    accepts: [
                        {
                            scheme: 'solana',
                            maxAmountRequired,
                            network: 'solana:mainnet',
                            payTo: 'TestRecipientAddress',
                            extra: { decimals: 6 }
                        }
                    ]
                }

                const result = tool['parsePaymentRequired'](body, 'solana')
                expect(result.maxAmountRequired).toBe(expected)
            })
        })

        it('should support Base network with CAIP-2 format', () => {
            const tool = new X402PaymentTool({
                url: 'https://api.example.com/endpoint',
                network: 'base',
                privateKey: 'privatekey'
            })

            const body = {
                accepts: [
                    {
                        scheme: 'eip3009',
                        maxAmountRequired: '0.00001',
                        network: 'eip155:8453',
                        payTo: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
                        extra: {
                            decimals: 6,
                            mint: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
                        }
                    }
                ]
            }

            const result = tool['parsePaymentRequired'](body, 'base')

            expect(result.maxAmountRequired).toBe('10') // 0.00001 * 10^6 = 10
            expect(result.network).toBe('base')
            expect(result.scheme).toBe('eip3009')
        })

        it('should handle default decimals when not specified', () => {
            const tool = new X402PaymentTool({
                url: 'https://api.example.com/endpoint',
                network: 'solana',
                privateKey: 'base64key'
            })

            const body = {
                accepts: [
                    {
                        scheme: 'solana',
                        maxAmountRequired: '0.001',
                        network: 'solana:mainnet',
                        payTo: 'TestRecipientAddress'
                    }
                ]
            }

            const result = tool['parsePaymentRequired'](body, 'solana')

            expect(result.maxAmountRequired).toBe('1000') // 0.001 * 10^6 (default decimals)
            expect(result.decimals).toBe(6) // Should default to 6 for USDC
        })

        it('should match network by substring for CAIP-2 compatibility', () => {
            const tool = new X402PaymentTool({
                url: 'https://api.example.com/endpoint',
                network: 'solana',
                privateKey: 'base64key'
            })

            const body = {
                accepts: [
                    {
                        scheme: 'solana',
                        amount: '1000',
                        network: 'solana:mainnet',
                        payTo: 'TestRecipientAddress',
                        extra: { decimals: 6 }
                    }
                ]
            }

            const result = tool['parsePaymentRequired'](body, 'solana')
            expect(result.network).toBe('solana')
        })

        it('should throw error for invalid maxAmountRequired value', () => {
            const tool = new X402PaymentTool({
                url: 'https://api.example.com/endpoint',
                network: 'solana',
                privateKey: 'base64key'
            })

            const body = {
                accepts: [
                    {
                        scheme: 'solana',
                        maxAmountRequired: 'invalid',
                        network: 'solana:mainnet',
                        payTo: 'TestRecipientAddress',
                        extra: { decimals: 6 }
                    }
                ]
            }

            expect(() => {
                tool['parsePaymentRequired'](body, 'solana')
            }).toThrow('Invalid maxAmountRequired value')
        })

        it('should throw error for invalid price value', () => {
            const tool = new X402PaymentTool({
                url: 'https://api.example.com/endpoint',
                network: 'solana',
                privateKey: 'base64key'
            })

            const body = {
                accepts: [
                    {
                        scheme: 'solana',
                        price: 'not_a_number',
                        network: 'solana:mainnet',
                        payTo: 'TestRecipientAddress',
                        extra: { decimals: 6 }
                    }
                ]
            }

            expect(() => {
                tool['parsePaymentRequired'](body, 'solana')
            }).toThrow('Invalid price value')
        })

        it('should handle both decimal and atomic formats in the same accepts array', () => {
            const tool = new X402PaymentTool({
                url: 'https://api.example.com/endpoint',
                network: 'solana',
                privateKey: 'base64key'
            })

            const body = {
                accepts: [
                    {
                        scheme: 'eip3009',
                        amount: '10000',
                        network: 'eip155:8453',
                        payTo: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
                        extra: { decimals: 6 }
                    },
                    {
                        scheme: 'solana',
                        maxAmountRequired: '0.002',
                        network: 'solana:mainnet',
                        payTo: 'TestRecipientAddress',
                        extra: { decimals: 6 }
                    }
                ]
            }

            const result = tool['parsePaymentRequired'](body, 'solana')

            // Should select the solana entry and convert maxAmountRequired correctly
            expect(result.maxAmountRequired).toBe('2000') // 0.002 * 10^6 = 2000
            expect(result.network).toBe('solana')
        })
    })

    describe('parsePaymentRequired - V1 format (backward compatibility)', () => {
        it('should parse V1 top-level fields correctly', () => {
            const tool = new X402PaymentTool({
                url: 'https://api.example.com/endpoint',
                network: 'solana',
                privateKey: 'base64key'
            })

            const body = {
                maxAmountRequired: '0.001',
                asset: 'usdc',
                payTo: 'TestRecipientAddress',
                network: 'solana:mainnet',
                scheme: 'solana'
            }

            const result = tool['parsePaymentRequired'](body, 'solana')

            expect(result.maxAmountRequired).toBe('1000') // V1 converts decimal to atomic
            expect(result.asset).toBe('usdc')
            expect(result.network).toBe('solana')
        })

        it('should throw error when V1 fields are missing', () => {
            const tool = new X402PaymentTool({
                url: 'https://api.example.com/endpoint',
                network: 'solana',
                privateKey: 'base64key'
            })

            const body = {
                maxAmountRequired: '0.001',
                asset: 'usdc'
                // Missing payTo, network, scheme
            }

            expect(() => {
                tool['parsePaymentRequired'](body, 'solana')
            }).toThrow('Invalid 402 response: missing required fields')
        })
    })

    describe('Network and asset validation', () => {
        it('should select compatible network from accepts array', () => {
            const tool = new X402PaymentTool({
                url: 'https://api.example.com/endpoint',
                network: 'base',
                privateKey: 'privatekey'
            })

            const body = {
                accepts: [
                    {
                        scheme: 'solana',
                        amount: '1000',
                        network: 'solana:mainnet',
                        payTo: 'SolanaAddress',
                        extra: { decimals: 6 }
                    },
                    {
                        scheme: 'eip3009',
                        maxAmountRequired: '0.00001',
                        network: 'eip155:8453',
                        payTo: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
                        extra: { decimals: 6, mint: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' }
                    }
                ]
            }

            const result = tool['parsePaymentRequired'](body, 'base')

            expect(result.network).toBe('base')
            expect(result.scheme).toBe('eip3009')
            expect(result.maxAmountRequired).toBe('10')
        })

        it('should normalize asset addresses to lowercase', () => {
            const tool = new X402PaymentTool({
                url: 'https://api.example.com/endpoint',
                network: 'solana',
                privateKey: 'base64key'
            })

            const body = {
                accepts: [
                    {
                        scheme: 'solana',
                        amount: '1000',
                        network: 'solana:mainnet',
                        payTo: 'TestRecipientAddress',
                        extra: {
                            decimals: 6,
                            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
                        }
                    }
                ]
            }

            const result = tool['parsePaymentRequired'](body, 'solana')

            expect(result.asset).toBe('epjfwwdd5aufqssqem2qn1xzybapc8g4weggkzwytdt1v')
        })

        it('should use default asset when mint is not specified', () => {
            const tool = new X402PaymentTool({
                url: 'https://api.example.com/endpoint',
                network: 'solana',
                privateKey: 'base64key'
            })

            const body = {
                accepts: [
                    {
                        scheme: 'solana',
                        amount: '1000',
                        network: 'solana:mainnet',
                        payTo: 'TestRecipientAddress',
                        extra: { decimals: 6 }
                    }
                ]
            }

            const result = tool['parsePaymentRequired'](body, 'solana')

            expect(result.asset).toBe('usdc')
        })
    })
})