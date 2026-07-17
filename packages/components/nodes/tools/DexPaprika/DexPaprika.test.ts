import { INodeData } from '../../../src/Interface'
import { GetTokenPriceTool, SearchPoolsTool, GetPoolOhlcvTool } from './core'

const { nodeClass: DexPaprika_Tools } = require('./DexPaprika')

jest.mock('node-fetch', () => jest.fn())
const mockedFetch = require('node-fetch') as jest.Mock

function createNodeData(inputs: any): INodeData {
    return {
        id: 'dexPaprika_0',
        label: 'DexPaprika',
        name: 'dexPaprika',
        type: 'DexPaprika',
        icon: 'dexpaprika.svg',
        version: 1.0,
        category: 'Tools',
        baseClasses: ['DexPaprika', 'Tool'],
        inputs
    }
}

function mockJsonResponse(body: string, ok = true, status = 200, statusText = 'OK') {
    mockedFetch.mockResolvedValueOnce({
        ok,
        status,
        statusText,
        text: async () => body
    })
}

describe('DexPaprika node', () => {
    beforeEach(() => {
        mockedFetch.mockReset()
    })

    describe('Node initialization', () => {
        it('should expose all three tools when no actions are selected', async () => {
            const nodeClass = new DexPaprika_Tools()
            const tools = await nodeClass.init(createNodeData({}))

            expect(Array.isArray(tools)).toBe(true)
            expect(tools.map((t: any) => t.name)).toEqual([
                'dexpaprika_get_token_price',
                'dexpaprika_search_pools',
                'dexpaprika_get_pool_ohlcv'
            ])
        })

        it('should only expose selected actions', async () => {
            const nodeClass = new DexPaprika_Tools()
            const tools = await nodeClass.init(createNodeData({ dexPaprikaActions: '["searchPools"]' }))

            expect(tools.map((t: any) => t.name)).toEqual(['dexpaprika_search_pools'])
        })

        it('should not require a credential', () => {
            const nodeClass = new DexPaprika_Tools()
            expect(nodeClass.credential).toBeUndefined()
        })
    })

    describe('GetTokenPriceTool', () => {
        it('should call the token endpoint and strip the long-form description', async () => {
            mockJsonResponse(
                JSON.stringify({
                    id: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                    symbol: 'WETH',
                    description: 'A very long project description',
                    summary: { price_usd: 1840.53 }
                })
            )

            const tool = new GetTokenPriceTool()
            const result = await tool._call({
                network: 'ethereum',
                tokenAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
            })

            expect(mockedFetch).toHaveBeenCalledWith(
                'https://api.dexpaprika.com/networks/ethereum/tokens/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                expect.objectContaining({ method: 'GET' })
            )
            const parsed = JSON.parse(result)
            expect(parsed.symbol).toBe('WETH')
            expect(parsed.summary.price_usd).toBe(1840.53)
            expect(parsed.description).toBeUndefined()
        })

        it('should throw a descriptive error on a non-OK response', async () => {
            mockJsonResponse('', false, 404, 'Not Found')

            const tool = new GetTokenPriceTool()
            await expect(tool._call({ network: 'notachain', tokenAddress: '0x0' })).rejects.toThrow('DexPaprika API error 404: Not Found')
        })
    })

    describe('SearchPoolsTool', () => {
        it('should build the search URL with filters and omit the token filter when unset', async () => {
            mockJsonResponse('{"results":[]}')

            const tool = new SearchPoolsTool()
            await tool._call({ network: 'solana', orderBy: 'liquidity_usd', sort: 'desc', limit: 5 })

            const calledUrl = new URL(mockedFetch.mock.calls[0][0])
            expect(calledUrl.pathname).toBe('/networks/solana/pools/search')
            expect(calledUrl.searchParams.get('order_by')).toBe('liquidity_usd')
            expect(calledUrl.searchParams.get('sort')).toBe('desc')
            expect(calledUrl.searchParams.get('limit')).toBe('5')
            expect(calledUrl.searchParams.has('token_address')).toBe(false)
        })

        it('should pass the token filter when set', async () => {
            mockJsonResponse('{"results":[]}')

            const tool = new SearchPoolsTool()
            await tool._call({
                network: 'ethereum',
                tokenAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                orderBy: 'volume_usd_24h',
                sort: 'desc',
                limit: 10
            })

            const calledUrl = new URL(mockedFetch.mock.calls[0][0])
            expect(calledUrl.searchParams.get('token_address')).toBe('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2')
        })
    })

    describe('GetPoolOhlcvTool', () => {
        it('should build the OHLCV URL with start, interval and limit', async () => {
            mockJsonResponse('[]')

            const tool = new GetPoolOhlcvTool()
            await tool._call({
                network: 'ethereum',
                poolAddress: '0xf6e72db5454dd049d0788e411b06cfaf16853042',
                start: '2026-07-10',
                interval: '1h',
                limit: 24
            })

            const calledUrl = new URL(mockedFetch.mock.calls[0][0])
            expect(calledUrl.pathname).toBe('/networks/ethereum/pools/0xf6e72db5454dd049d0788e411b06cfaf16853042/ohlcv')
            expect(calledUrl.searchParams.get('start')).toBe('2026-07-10')
            expect(calledUrl.searchParams.get('interval')).toBe('1h')
            expect(calledUrl.searchParams.get('limit')).toBe('24')
            expect(calledUrl.searchParams.has('end')).toBe(false)
        })
    })
})
