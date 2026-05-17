import { z } from 'zod/v3'
import { DynamicStructuredTool } from '../OpenAPIToolkit/core'
import { secureFetch } from '../../../src/httpSecurity'

export const desc = `Use this when you need to call a paid API endpoint that requires x402 payment protocol. This tool automatically handles HTTP 402 Payment Required responses.`

export interface X402PaymentParameters {
    headers?: Record<string, string>
    url: string
    name?: string
    description?: string
    maxPrice?: number
    network?: 'solana' | 'base'
    privateKey?: string
    maxOutputLength?: number
    solanaRpcUrl?: string
    baseRpcUrl?: string
}

export interface X402PaymentResponse {
    success: boolean
    data?: string
    error?: string
    txHash?: string
    payment?: {
        amount: string
        currency: string
        chain: string
        txHash: string
    }
}

export interface X402PaymentAccept {
    scheme: string
    price: string
    network: string
    payTo: string
    asset?: string
    extra?: {
        decimals?: number
        mint?: string
    }
}

export interface X402PaymentRequired {
    maxAmountRequired: string
    asset: string
    payTo: string
    network: string
    scheme: string
    decimals: number
    mint?: string
}

export class X402PaymentTool extends DynamicStructuredTool {
    url = ''
    maxPrice = 10
    network: 'solana' | 'base' = 'solana'
    privateKey = ''
    maxOutputLength = Infinity
    headers: Record<string, string> = {}
    solanaRpcUrl = 'https://api.mainnet-beta.solana.com'
    baseRpcUrl = 'https://mainnet.base.org'

    constructor(args?: X402PaymentParameters) {
        const schema = z.object({
            body: z.record(z.any()).optional().describe('Request body for POST requests'),
            method: z.string().optional().default('GET').describe('HTTP method (GET, POST, etc.)'),
            queryParams: z.record(z.string()).optional().describe('Query parameters for the request')
        })

        const toolInput = {
            name: args?.name || 'x402_payment',
            description: args?.description || desc,
            schema: schema,
            baseUrl: '',
            method: 'POST',
            headers: args?.headers || {}
        }
        super(toolInput)
        this.url = args?.url ?? this.url
        this.headers = args?.headers ?? this.headers
        this.maxPrice = args?.maxPrice ?? this.maxPrice
        this.network = args?.network ?? this.network
        this.privateKey = args?.privateKey ?? this.privateKey
        this.maxOutputLength = args?.maxOutputLength ?? this.maxOutputLength
        this.solanaRpcUrl = args?.solanaRpcUrl ?? this.solanaRpcUrl
        this.baseRpcUrl = args?.baseRpcUrl ?? this.baseRpcUrl
    }

    private parsePaymentRequired(body: any, userNetwork: string): X402PaymentRequired {
        // Known USDC mint addresses for validation
        const knownUsdcMints = {
            'solana-mainnet': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            'solana-devnet': '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
            'base-mainnet': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
        }

        // V2 format: accepts[] array
        if (body.accepts && Array.isArray(body.accepts) && body.accepts.length > 0) {
            // Find a compatible requirement (matching user's preferred network or USDC asset)
            const compatibleReq = body.accepts.find((req: X402PaymentAccept) => {
                const reqNetwork = req.network.toLowerCase()
                const userNet = userNetwork.toLowerCase()

                // Match by network (support CAIP-2 format like "solana:mainnet" or "eip155:8453")
                if (reqNetwork === userNet || reqNetwork.includes(userNet) || userNet.includes(reqNetwork)) {
                    return true
                }

                // Or match by known USDC mint
                if (req.extra?.mint) {
                    return Object.values(knownUsdcMints).includes(req.extra.mint)
                }

                return false
            })

            if (!compatibleReq) {
                throw new Error(`No compatible payment option found in accepts[] array for network: ${userNetwork}`)
            }

            // Extract decimals from extra or default to 6 (USDC)
            const decimals = compatibleReq.extra?.decimals ?? 6

            // Determine asset (use mint if available, otherwise asset field)
            const asset = compatibleReq.extra?.mint || compatibleReq.asset || 'usdc'

            // Normalize network to base name for routing (strip CAIP-2 prefix)
            const normalizedNetwork = (() => {
                const net = compatibleReq.network.toLowerCase()
                if (net.startsWith('solana')) return 'solana'
                if (net.startsWith('eip155')) return 'base'
                if (net.startsWith('base')) return 'base'
                return net
            })()

            return {
                maxAmountRequired: compatibleReq.price,
                asset: asset.toLowerCase(),
                payTo: compatibleReq.payTo,
                network: normalizedNetwork,
                scheme: compatibleReq.scheme.toLowerCase(),
                decimals: decimals,
                mint: compatibleReq.extra?.mint
            }
        }

        // V1 format: top-level fields (fallback for backward compatibility)
        if (!body.maxAmountRequired || !body.asset || !body.payTo || !body.network || !body.scheme) {
            throw new Error('Invalid 402 response: missing required fields in response body (expected accepts[] or top-level fields)')
        }

        // For V1, maxAmountRequired might be a decimal string, convert to atomic units
        // Default to 6 decimals (USDC) if not specified
        const decimals = body.extra?.decimals ?? 6
        const maxAmountDecimal = parseFloat(body.maxAmountRequired)

        if (isNaN(maxAmountDecimal)) {
            throw new Error('Invalid maxAmountRequired in 402 response')
        }

        // Convert decimal to atomic units
        const atomicAmount = (BigInt(Math.round(maxAmountDecimal * 1e6))).toString()

        // For V1, normalize network to base name
        const v1Network = body.network.toLowerCase()
        const normalizedNetwork = (() => {
            if (v1Network.startsWith('solana')) return 'solana'
            if (v1Network.startsWith('eip155') || v1Network.startsWith('base')) return 'base'
            return v1Network
        })()

        return {
            maxAmountRequired: atomicAmount,
            asset: (body.extra?.mint || body.asset).toLowerCase(),
            payTo: body.payTo,
            network: normalizedNetwork,
            scheme: body.scheme.toLowerCase(),
            decimals: decimals,
            mint: body.extra?.mint
        }
    }

    private parseSolanaPrivateKey(): Buffer {
        // Try base64 format (original)
        try {
            return Buffer.from(this.privateKey, 'base64')
        } catch {}

        // Try base58 format
        try {
            const bs58 = require('bs58')
            return bs58.decode(this.privateKey)
        } catch {}

        // Try JSON array format
        try {
            const keyArray = JSON.parse(this.privateKey)
            if (Array.isArray(keyArray) && keyArray.length === 64) {
                return Buffer.from(keyArray)
            }
        } catch {}

        throw new Error('Unsupported private key format. Supported formats: base64, base58, JSON array of 64 bytes')
    }

    private validateUsdcMint(mint: string, network: string): void {
        const knownUsdcMints = {
            'solana': new Set([
                'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // mainnet
                '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'  // devnet
            ]),
            'base': new Set([
                '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // mainnet
            ])
        }

        const normalizedMint = mint.toLowerCase()
        const networkMints = knownUsdcMints[network as keyof typeof knownUsdcMints]

        if (!networkMints || !networkMints.has(normalizedMint)) {
            throw new Error(`Unsupported USDC mint address: ${mint} for network: ${network}`)
        }
    }

    private async signSolanaPayment(paymentReq: X402PaymentRequired): Promise<{ signature: string; envelope: string }> {
        const { Keypair, Connection, PublicKey, Transaction, SystemProgram } = require('@solana/web3.js')
        const { createTransferCheckedInstruction, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } = require('@solana/spl-token')

        if (paymentReq.network !== 'solana') {
            throw new Error(`Unsupported network: ${paymentReq.network}`)
        }

        // Validate USDC mint address (V2 format) or asset string (V1 format)
        if (paymentReq.mint) {
            this.validateUsdcMint(paymentReq.mint, 'solana')
        }

        const keypair = Keypair.fromSecretKey(this.parseSolanaPrivateKey())
        const connection = new Connection(this.solanaRpcUrl, 'confirmed')

        const usdcMint = new PublicKey(paymentReq.mint || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
        const fromAddress = keypair.publicKey
        const toAddress = new PublicKey(paymentReq.payTo)

        // maxAmountRequired is already in atomic units (string or bigint)
        const rawAmount = BigInt(paymentReq.maxAmountRequired)

        const fromATA = getAssociatedTokenAddressSync(usdcMint, fromAddress)
        const toATA = getAssociatedTokenAddressSync(usdcMint, toAddress)

        const instruction = createTransferCheckedInstruction(
            fromATA,
            usdcMint,
            toATA,
            fromAddress,
            rawAmount,
            paymentReq.decimals,
            [],
            TOKEN_PROGRAM_ID
        )

        const transaction = new Transaction().add(instruction)

        const { blockhash } = await connection.getLatestBlockhash()
        transaction.recentBlockhash = blockhash
        transaction.feePayer = fromAddress

        transaction.sign(keypair)

        const serializedTransaction = transaction.serialize().toString('base64')

        const envelope = JSON.stringify({
            version: '1.0',
            chain: 'solana',
            currency: 'usdc',
            amount: paymentReq.maxAmountRequired,
            to: paymentReq.payTo,
            transaction: serializedTransaction
        })

        return { signature: serializedTransaction, envelope }
    }

    private async signBasePayment(paymentReq: X402PaymentRequired): Promise<{ signature: string; envelope: string }> {
        if (paymentReq.network !== 'base') {
            throw new Error(`Unsupported network: ${paymentReq.network}`)
        }

        // Validate USDC mint address (V2 format) or asset string (V1 format)
        if (paymentReq.mint) {
            this.validateUsdcMint(paymentReq.mint, 'base')
        }

        const { ethers } = require('ethers')

        const wallet = new ethers.Wallet(this.privateKey)

        const usdcAddress = paymentReq.mint || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

        // maxAmountRequired is already in atomic units
        const amount = BigInt(paymentReq.maxAmountRequired)

        // EIP-3009 transferWithAuthorization parameters
        const now = Math.floor(Date.now() / 1000)
        const validAfter = now
        const validBefore = now + 3600 // 1 hour from now

        // Generate a unique nonce
        const nonce = ethers.hexlify(ethers.randomBytes(32))

        // EIP-712 typed data for EIP-3009
        const domain = {
            name: 'USD Coin',
            version: '2',
            chainId: 8453,
            verifyingContract: usdcAddress
        }

        const types = {
            TransferWithAuthorization: [
                { name: 'from', type: 'address' },
                { name: 'to', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'validAfter', type: 'uint256' },
                { name: 'validBefore', type: 'uint256' },
                { name: 'nonce', type: 'bytes32' }
            ]
        }

        const values = {
            from: wallet.address,
            to: paymentReq.payTo,
            value: amount,
            validAfter: validAfter,
            validBefore: validBefore,
            nonce: nonce
        }

        // Sign the EIP-712 typed data
        const signature = await wallet.signTypedData(domain, types, values)

        // Split signature into v, r, s components
        const ethSignature = ethers.Signature.from(signature)
        const v = ethSignature.v
        const r = ethSignature.r
        const s = ethSignature.s

        // Create EIP-3009 authorization object
        const authorization = {
            from: values.from,
            to: values.to,
            value: values.value.toString(),
            validAfter: values.validAfter,
            validBefore: values.validBefore,
            nonce: values.nonce,
            v: v,
            r: r,
            s: s
        }

        // Encode authorization as base64 for envelope
        const authorizationBase64 = Buffer.from(JSON.stringify(authorization)).toString('base64')

        const envelope = JSON.stringify({
            version: '1.0',
            chain: 'base',
            currency: 'usdc',
            amount: paymentReq.maxAmountRequired,
            to: paymentReq.payTo,
            authorization: authorizationBase64
        })

        return { signature: authorizationBase64, envelope }
    }

    private async signPayment(paymentReq: X402PaymentRequired): Promise<{ signature: string; envelope: string }> {
        // Convert maxPrice from decimal to atomic units for comparison
        const maxPriceAtomic = BigInt(Math.round(this.maxPrice * (10 ** paymentReq.decimals)))
        const requiredAmount = BigInt(paymentReq.maxAmountRequired)

        if (requiredAmount > maxPriceAtomic) {
            const decimalAmount = Number(requiredAmount) / (10 ** paymentReq.decimals)
            throw new Error(`Max amount ${decimalAmount} ${paymentReq.asset} exceeds maximum allowed price of ${this.maxPrice}`)
        }

        if (paymentReq.network === 'solana') {
            return this.signSolanaPayment(paymentReq)
        } else if (paymentReq.network === 'base') {
            return this.signBasePayment(paymentReq)
        } else {
            throw new Error(`Unsupported network: ${paymentReq.network}`)
        }
    }

    /** @ignore */
    async _call(arg: any): Promise<string> {
        const inputUrl = this.url
        if (!inputUrl) {
            throw new Error('URL is required for x402 payment')
        }

        if (!this.privateKey) {
            throw new Error('Private key is required for signing payments')
        }

        let finalUrl = inputUrl
        if (arg.queryParams && Object.keys(arg.queryParams).length > 0) {
            const url = new URL(finalUrl)
            Object.entries(arg.queryParams).forEach(([key, value]) => {
                url.searchParams.append(key, String(value))
            })
            finalUrl = url.toString()
        }

        const requestHeaders = {
            ...(this.headers || {}),
            'Content-Type': 'application/json'
        }

        const method = arg.method || 'GET'
        const body = arg.body ? JSON.stringify(arg.body) : undefined

        try {
            let res = await secureFetch(finalUrl, {
                method,
                headers: requestHeaders,
                body
            })

            if (res.status === 402) {
                // Parse payment requirements, passing user's network preference for accepts[] selection
                const paymentReq = this.parsePaymentRequired(await res.json(), this.network)
                const { signature, envelope } = await this.signPayment(paymentReq)

                // Use PAYMENT-SIGNATURE header for V2 compliance (server will verify, not broadcast)
                const paymentHeaders = {
                    ...requestHeaders,
                    'PAYMENT-SIGNATURE': envelope
                }

                res = await secureFetch(finalUrl, {
                    method,
                    headers: paymentHeaders,
                    body
                })

                if (!res.ok) {
                    throw new Error(`Payment sent but request failed: HTTP ${res.status}`)
                }

                const text = await res.text()
                // Apply maxOutputLength truncation to paid responses
                const truncatedText = text.slice(0, this.maxOutputLength)

                const response: X402PaymentResponse = {
                    success: true,
                    data: truncatedText,
                    txHash: signature,
                    payment: {
                        amount: paymentReq.maxAmountRequired,
                        currency: paymentReq.asset,
                        chain: paymentReq.network,
                        txHash: signature
                    }
                }

                return JSON.stringify(response)
            }

            if (!res.ok) {
                throw new Error(`HTTP Error ${res.status}: ${res.statusText}`)
            }

            // For non-payment responses, return JSON format for consistency
            const text = await res.text()
            const truncatedText = text.slice(0, this.maxOutputLength)

            const response: X402PaymentResponse = {
                success: true,
                data: truncatedText
            }

            return JSON.stringify(response)
        } catch (error) {
            if (error instanceof Error) {
                const errorResponse: X402PaymentResponse = {
                    success: false,
                    error: error.message
                }
                return JSON.stringify(errorResponse)
            }
            const errorResponse: X402PaymentResponse = {
                success: false,
                error: 'Unknown error occurred'
            }
            return JSON.stringify(errorResponse)
        }
    }
}
