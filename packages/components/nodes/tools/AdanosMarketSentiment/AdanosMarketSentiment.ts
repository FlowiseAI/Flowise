import axios from 'axios'
import { StructuredTool } from '@langchain/core/tools'
import { z } from 'zod/v3'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

const BASE_URL = 'https://api.adanos.org'
const REQUEST_TIMEOUT_MS = 15_000
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const STOCK_PATTERN = /^\$?[A-Z0-9][A-Z0-9.-]{0,19}$/i
const CRYPTO_PATTERN = /^\$?[A-Z0-9]{1,20}$/i

const operationSchema = z.enum(['stock_sentiment', 'crypto_sentiment', 'trending', 'market_sentiment'])
const assetTypeSchema = z.enum(['stock', 'crypto'])
const stockSourceSchema = z.enum(['reddit', 'x', 'news', 'polymarket'])

function isValidDate(value: string): boolean {
    if (!DATE_PATTERN.test(value)) return false
    const date = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

const adanosInputSchema = z
    .object({
        operation: operationSchema.describe('The Adanos operation to perform'),
        symbol: z.string().optional().describe('Required for stock_sentiment and crypto_sentiment. Examples: AAPL, BRK.A, BTC.'),
        assetType: assetTypeSchema.default('stock').describe('Asset type used by trending and market_sentiment'),
        source: stockSourceSchema.default('reddit').describe('Stock source. Crypto sentiment currently uses Reddit.'),
        from: z.string().refine(isValidDate, 'from must use YYYY-MM-DD format').optional(),
        to: z.string().refine(isValidDate, 'to must use YYYY-MM-DD format').optional(),
        limit: z.number().int().min(1).max(100).default(20).describe('Maximum results for trending')
    })
    .superRefine((input, context) => {
        if (input.operation === 'stock_sentiment' || input.operation === 'crypto_sentiment') {
            if (!input.symbol?.trim()) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `symbol is required for ${input.operation}`,
                    path: ['symbol']
                })
            } else {
                const crypto = input.operation === 'crypto_sentiment'
                const pattern = crypto ? CRYPTO_PATTERN : STOCK_PATTERN
                if (!pattern.test(input.symbol.trim())) {
                    context.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `Invalid ${crypto ? 'crypto symbol' : 'stock ticker'}`,
                        path: ['symbol']
                    })
                }
            }
        }
        if (input.from && input.to && input.from > input.to) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'from must not be after to',
                path: ['from']
            })
        }
    })

type AdanosInput = z.infer<typeof adanosInputSchema>

function normalizeSymbol(value: string): string {
    return value.trim().toUpperCase().replace(/^\$/, '')
}

function buildRequest(input: AdanosInput): { path: string; params: Record<string, string | number> } {
    const params: Record<string, string | number> = {}
    if (input.from) params.from = input.from
    if (input.to) params.to = input.to

    switch (input.operation) {
        case 'stock_sentiment':
            return {
                path: `/${input.source}/stocks/v1/stock/${normalizeSymbol(input.symbol ?? '')}`,
                params
            }
        case 'crypto_sentiment':
            return {
                path: `/reddit/crypto/v1/token/${normalizeSymbol(input.symbol ?? '')}`,
                params
            }
        case 'trending':
            return {
                path: input.assetType === 'crypto' ? '/reddit/crypto/v1/trending' : `/${input.source}/stocks/v1/trending`,
                params: { ...params, limit: input.limit }
            }
        case 'market_sentiment':
            return {
                path: input.assetType === 'crypto' ? '/reddit/crypto/v1/market-sentiment' : `/${input.source}/stocks/v1/market-sentiment`,
                params
            }
    }
    throw new Error('Unsupported Adanos operation')
}

function getErrorMessage(error: unknown): string {
    if (!axios.isAxiosError(error)) return error instanceof Error ? error.message : 'Unknown error'

    const status = error.response?.status
    const data = error.response?.data
    const detail = typeof data === 'object' && data !== null && 'detail' in data ? data.detail : undefined
    const message = typeof detail === 'string' ? detail : error.message
    return status ? `HTTP ${status}: ${message}` : message
}

class AdanosMarketSentimentTool extends StructuredTool {
    name = 'adanos_market_sentiment'
    description =
        'Get structured market sentiment for stocks or crypto from Adanos. Supports per-asset sentiment, trending assets, and aggregate market sentiment using Reddit, X / FinTwit, financial news, or Polymarket data.'
    schema = adanosInputSchema

    constructor(private readonly apiKey: string) {
        super()
    }

    async _call(input: AdanosInput): Promise<string> {
        const request = buildRequest(input)
        try {
            const response = await axios.get(`${BASE_URL}${request.path}`, {
                headers: {
                    Accept: 'application/json',
                    'X-API-Key': this.apiKey
                },
                params: request.params,
                timeout: REQUEST_TIMEOUT_MS
            })
            return JSON.stringify(response.data)
        } catch (error) {
            throw new Error(`Adanos request failed: ${getErrorMessage(error)}`)
        }
    }
}

class AdanosMarketSentiment_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Adanos Market Sentiment'
        this.name = 'adanosMarketSentiment'
        this.version = 1.0
        this.type = 'AdanosMarketSentiment'
        this.icon = 'adanos.svg'
        this.category = 'Tools'
        this.description = 'Stock and crypto sentiment from Reddit, X / FinTwit, financial news, and Polymarket'
        this.inputs = []
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['adanosApi']
        }
        this.baseClasses = [this.type, ...getBaseClasses(AdanosMarketSentimentTool)]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<AdanosMarketSentimentTool> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const credentialValue = getCredentialParam('adanosApiKey', credentialData, nodeData)
        if (typeof credentialValue !== 'string' || !credentialValue.trim()) throw new Error('Adanos API key is required')
        return new AdanosMarketSentimentTool(credentialValue.trim())
    }
}

export { AdanosMarketSentimentTool, adanosInputSchema, buildRequest }
module.exports = { nodeClass: AdanosMarketSentiment_Tools }
