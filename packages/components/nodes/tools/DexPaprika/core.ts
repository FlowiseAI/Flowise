import { z } from 'zod/v3'
import fetch from 'node-fetch'
import { DynamicStructuredTool } from '../OpenAPIToolkit/core'

export const desc = `Get onchain DEX market data from DexPaprika: token prices, liquidity pools and OHLCV candles across 36 blockchain networks. No API key required.`

const BASE_URL = 'https://api.dexpaprika.com'

const NETWORK_DESCRIPTION = `Network id in lowercase, e.g. "ethereum", "solana", "base", "arbitrum", "bsc", "polygon". Full list at ${BASE_URL}/networks`

export interface DexPaprikaToolParameters {
    actions?: string[]
}

// Schema for fetching a token price by contract address
const GetTokenPriceSchema = z.object({
    network: z.string().describe(NETWORK_DESCRIPTION),
    tokenAddress: z.string().describe('Token contract address on the given network (mint address on Solana)')
})

// Schema for searching pools on a network
const SearchPoolsSchema = z.object({
    network: z.string().describe(NETWORK_DESCRIPTION),
    tokenAddress: z
        .string()
        .optional()
        .describe('Optional token contract address. When set, only pools that include this token are returned'),
    orderBy: z
        .enum([
            'volume_usd_24h',
            'volume_usd_7d',
            'volume_usd_30d',
            'liquidity_usd',
            'txns_24h',
            'created_at',
            'price_usd',
            'price_change_percentage_24h'
        ])
        .optional()
        .default('volume_usd_24h')
        .describe('Field to order results by'),
    sort: z.enum(['asc', 'desc']).optional().default('desc').describe('Sort direction'),
    limit: z.number().int().min(1).max(100).optional().default(10).describe('Number of pools to return, 1 to 100')
})

// Schema for fetching OHLCV candles of a pool
const GetPoolOhlcvSchema = z.object({
    network: z.string().describe(NETWORK_DESCRIPTION),
    poolAddress: z.string().describe('Pool contract address on the given network'),
    start: z.string().describe('Start of the time range, e.g. "2026-07-01" or RFC3339 like "2026-07-01T00:00:00Z". Required'),
    end: z.string().optional().describe('Optional end of the time range, same formats as start'),
    interval: z.enum(['1m', '5m', '10m', '15m', '30m', '1h', '6h', '12h', '24h']).optional().default('1h').describe('Candle interval'),
    limit: z.number().int().min(1).max(366).optional().default(24).describe('Number of candles to return, 1 to 366')
})

class BaseDexPaprikaTool extends DynamicStructuredTool {
    async makeRequest(path: string, params?: Record<string, string | number | undefined>): Promise<string> {
        const url = new URL(`${BASE_URL}${path}`)
        if (params) {
            for (const [key, value] of Object.entries(params)) {
                if (value !== undefined && value !== '') {
                    url.searchParams.append(key, String(value))
                }
            }
        }

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: { Accept: 'application/json', ...this.headers }
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`DexPaprika API error ${response.status}: ${errorText || response.statusText}`)
        }

        return await response.text()
    }
}

export class GetTokenPriceTool extends BaseDexPaprikaTool {
    constructor() {
        super({
            name: 'dexpaprika_get_token_price',
            description:
                'Get the current USD price and market stats (fully diluted valuation, liquidity, 24h volume and transactions) of a token by its contract address',
            schema: GetTokenPriceSchema,
            baseUrl: BASE_URL,
            method: 'GET',
            headers: {}
        })
    }

    async _call(arg: z.infer<typeof GetTokenPriceSchema>): Promise<string> {
        const data = await this.makeRequest(`/networks/${encodeURIComponent(arg.network)}/tokens/${encodeURIComponent(arg.tokenAddress)}`)
        try {
            const parsed = JSON.parse(data)
            if (parsed === null || typeof parsed !== 'object') {
                // Not the object response we expect; hand back the raw payload unchanged
                return data
            }
            // The long-form project description adds noise without market data value
            delete parsed.description
            return JSON.stringify(parsed)
        } catch {
            return data
        }
    }
}

export class SearchPoolsTool extends BaseDexPaprikaTool {
    constructor() {
        super({
            name: 'dexpaprika_search_pools',
            description:
                'List liquidity pools on a network ordered by volume, liquidity, transactions or price change. Optionally filter to pools that contain a specific token address',
            schema: SearchPoolsSchema,
            baseUrl: BASE_URL,
            method: 'GET',
            headers: {}
        })
    }

    async _call(arg: z.infer<typeof SearchPoolsSchema>): Promise<string> {
        return await this.makeRequest(`/networks/${encodeURIComponent(arg.network)}/pools/search`, {
            token_address: arg.tokenAddress,
            order_by: arg.orderBy,
            sort: arg.sort,
            limit: arg.limit
        })
    }
}

export class GetPoolOhlcvTool extends BaseDexPaprikaTool {
    constructor() {
        super({
            name: 'dexpaprika_get_pool_ohlcv',
            description:
                'Get historical OHLCV (open, high, low, close, volume) candles for a liquidity pool. Useful for price history and technical analysis',
            schema: GetPoolOhlcvSchema,
            baseUrl: BASE_URL,
            method: 'GET',
            headers: {}
        })
    }

    async _call(arg: z.infer<typeof GetPoolOhlcvSchema>): Promise<string> {
        return await this.makeRequest(`/networks/${encodeURIComponent(arg.network)}/pools/${encodeURIComponent(arg.poolAddress)}/ohlcv`, {
            start: arg.start,
            end: arg.end,
            interval: arg.interval,
            limit: arg.limit
        })
    }
}

export const createDexPaprikaTools = (params?: DexPaprikaToolParameters): DynamicStructuredTool[] => {
    const actions = params?.actions ?? []
    const tools: DynamicStructuredTool[] = []

    // When no actions are selected, enable all of them so the node works with zero configuration
    const enableAll = actions.length === 0

    if (enableAll || actions.includes('getTokenPrice')) {
        tools.push(new GetTokenPriceTool())
    }

    if (enableAll || actions.includes('searchPools')) {
        tools.push(new SearchPoolsTool())
    }

    if (enableAll || actions.includes('getPoolOhlcv')) {
        tools.push(new GetPoolOhlcvTool())
    }

    return tools
}
