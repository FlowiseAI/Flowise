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
}

export interface X402PaymentResponse {
    success: boolean
    data?: string
    error?: string
    txHash?: string
    payment?: {
        amount: number
        currency: string
        chain: string
        txHash: string
    }
}

export interface X402PaymentRequired {
    maxAmountRequired: number
    asset: string
    payTo: string
    network: string
    scheme: string
    extra?: {
        decimals: number
        mint: string
    }
}

export class X402PaymentTool extends DynamicStructuredTool {
    url = ''
    maxPrice = 10
    network: 'solana' | 'base' = 'solana'
    privateKey = ''
    maxOutputLength = Infinity
    headers: Record<string, string> = {}

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
    }

    private parsePaymentRequired(body: any): X402PaymentRequired {
        if (!body.maxAmountRequired || !body.asset || !body.payTo || !body.network || !body.scheme) {
            throw new Error('Invalid 402 response: missing required fields in response body')
        }

        const maxAmountRequired = parseFloat(body.maxAmountRequired)
        if (isNaN(maxAmountRequired)) {
            throw new Error('Invalid maxAmountRequired in 402 response')
        }

        return {
            maxAmountRequired,
            asset: body.asset.toLowerCase(),
            payTo: body.payTo,
            network: body.network.toLowerCase(),
            scheme: body.scheme,
            extra: body.extra
        }
    }

    private async signSolanaPayment(paymentReq: X402PaymentRequired): Promise<{ signature: string; envelope: string }> {
        const { Keypair, Connection, PublicKey, Transaction, SystemProgram } = require('@solana/web3.js')
        const { createTransferCheckedInstruction, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } = require('@solana/spl-token')

        if (paymentReq.network !== 'solana') {
            throw new Error(`Unsupported network: ${paymentReq.network}`)
        }

        if (paymentReq.asset !== 'usdc') {
            throw new Error(`Unsupported asset: ${paymentReq.asset}`)
        }

        const keypair = Keypair.fromSecretKey(Buffer.from(this.privateKey, 'base64'))
        const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed')

        const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
        const fromAddress = keypair.publicKey
        const toAddress = new PublicKey(paymentReq.payTo)

        const rawAmount = BigInt(Math.round(paymentReq.maxAmountRequired * 1e6))

        const fromATA = getAssociatedTokenAddressSync(usdcMint, fromAddress)
        const toATA = getAssociatedTokenAddressSync(usdcMint, toAddress)

        const instruction = createTransferCheckedInstruction(
            fromATA,
            usdcMint,
            toATA,
            fromAddress,
            rawAmount,
            6,
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

        if (paymentReq.asset !== 'usdc') {
            throw new Error(`Unsupported asset: ${paymentReq.asset}`)
        }

        const { ethers } = require('ethers')

        const wallet = new ethers.Wallet(this.privateKey)
        const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')

        const usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
        const amount = ethers.parseUnits(paymentReq.maxAmountRequired.toString(), 6)

        const abi = ['function transfer(address to, uint256 amount) returns (bool)']
        const contract = new ethers.Contract(usdcAddress, abi, wallet)

        const nonce = await provider.getTransactionCount(wallet.address, 'pending')
        const gasLimit = await contract.transfer.estimateGas(paymentReq.payTo, amount)
        const feeData = await provider.getFeeData()

        const unsignedTx = await contract.transfer.populateTransaction(paymentReq.payTo, amount)

        const transaction = {
            to: usdcAddress,
            from: wallet.address,
            data: unsignedTx.data,
            nonce: nonce,
            gasLimit: gasLimit,
            maxFeePerGas: feeData.maxFeePerGas,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
            chainId: 8453
        }

        const signedTx = await wallet.signTransaction(transaction)

        const envelope = JSON.stringify({
            version: '1.0',
            chain: 'base',
            currency: 'usdc',
            amount: paymentReq.maxAmountRequired,
            to: paymentReq.payTo,
            transaction: signedTx
        })

        return { signature: signedTx, envelope }
    }

    private async signPayment(paymentReq: X402PaymentRequired): Promise<{ signature: string; envelope: string }> {
        if (paymentReq.maxAmountRequired > this.maxPrice) {
            throw new Error(`Max amount ${paymentReq.maxAmountRequired} ${paymentReq.asset} exceeds maximum allowed price of ${this.maxPrice}`)
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
                const paymentReq = this.parsePaymentRequired(await res.json())
                const { signature, envelope } = await this.signPayment(paymentReq)

                const paymentHeaders = {
                    ...requestHeaders,
                    'X-Payment': envelope
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
                const response: X402PaymentResponse = {
                    success: true,
                    data: text,
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

            const text = await res.text()
            return text.slice(0, this.maxOutputLength)
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
