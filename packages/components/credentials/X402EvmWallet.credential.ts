import { INodeParams, INodeCredential } from '../src/Interface'

/**
 * Holds the buyer wallet used by @x402/evm to sign USDC payments (Base / other EVM networks).
 * Matches the x402 “Quickstart for Buyers” pattern (private key signer).
 */
class X402EvmWallet implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'x402 EVM Wallet'
        this.name = 'x402EvmWallet'
        this.version = 1.0
        this.description =
            'EVM private key for x402 (USDC) payments. See <a target="_blank" href="https://docs.x402.org/getting-started/quickstart-for-buyers">x402 buyer quickstart</a> and <a target="_blank" href="https://pyrimid.ai/quickstart">Pyrimid quickstart</a>. Treat like a secret: fund with small USDC amounts only.'
        this.inputs = [
            {
                label: 'EVM Private Key',
                name: 'evmPrivateKey',
                type: 'password',
                placeholder: '0x...'
            },
            {
                label: 'EVM RPC URL (optional)',
                name: 'evmRpcUrl',
                type: 'string',
                optional: true,
                description: 'HTTPS JSON-RPC for on-chain reads / gas-sponsored extensions',
                placeholder: 'https://...'
            }
        ]
    }
}

module.exports = { credClass: X402EvmWallet }
