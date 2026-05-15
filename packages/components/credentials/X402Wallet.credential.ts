import { INodeParams, INodeCredential } from '../src/Interface'

class X402Wallet implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    optional: boolean
    inputs: INodeParams[]

    constructor() {
        this.label = 'x402 Wallet'
        this.name = 'x402Wallet'
        this.version = 1.0
        this.description = 'Wallet credentials for x402 payment protocol. Supports Solana and Base networks.'
        this.optional = false
        this.inputs = [
            {
                label: 'Network',
                name: 'network',
                type: 'options',
                description: 'Select the blockchain network for payments',
                options: [
                    {
                        label: 'Solana',
                        name: 'solana'
                    },
                    {
                        label: 'Base (Ethereum L2)',
                        name: 'base'
                    }
                ],
                default: 'solana'
            },
            {
                label: 'Private Key',
                name: 'privateKey',
                type: 'password',
                description: 'Wallet private key for signing payments (never shared with API servers)',
                placeholder: 'Enter private key'
            }
        ]
    }
}

module.exports = { credClass: X402Wallet }
