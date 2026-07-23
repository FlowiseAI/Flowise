const mockGet = jest.fn()
const mockIsAxiosError = jest.fn()

jest.mock('axios', () => ({
    __esModule: true,
    default: {
        get: mockGet,
        isAxiosError: mockIsAxiosError
    }
}))

jest.mock('../../../src/utils', () => ({
    getBaseClasses: jest.fn(() => ['Tool', 'StructuredTool']),
    getCredentialData: jest.fn(async () => ({ adanosApiKey: process.env.PATH ?? '' })),
    getCredentialParam: jest.fn((name: string, data: Record<string, string>) => data[name])
}))

describe('AdanosMarketSentiment', () => {
    let NodeClass: any

    beforeEach(async () => {
        jest.clearAllMocks()
        mockIsAxiosError.mockReturnValue(false)
        mockGet.mockResolvedValue({ data: { sentiment: 0.42 } })
        const module = (await import('./AdanosMarketSentiment')) as any
        NodeClass = module.nodeClass
    })

    async function createTool() {
        const node = new NodeClass()
        return node.init({ credential: process.env.PATH ?? '', inputs: {} }, '', {})
    }

    it('declares the expected Flowise node and protected credential', () => {
        const node = new NodeClass()
        expect(node.name).toBe('adanosMarketSentiment')
        expect(node.credential.credentialNames).toEqual(['adanosApi'])
        expect(node.baseClasses).toContain('StructuredTool')
    })

    it.each([
        [
            { operation: 'stock_sentiment', symbol: '$aapl', source: 'news', from: '2026-06-01', to: '2026-06-30' },
            'https://api.adanos.org/news/stocks/v1/stock/AAPL',
            { from: '2026-06-01', to: '2026-06-30' }
        ],
        [{ operation: 'crypto_sentiment', symbol: 'btc' }, 'https://api.adanos.org/reddit/crypto/v1/token/BTC', {}],
        [{ operation: 'trending', assetType: 'stock', source: 'x', limit: 7 }, 'https://api.adanos.org/x/stocks/v1/trending', { limit: 7 }],
        [{ operation: 'market_sentiment', assetType: 'crypto' }, 'https://api.adanos.org/reddit/crypto/v1/market-sentiment', {}]
    ])('builds the documented request for %#', async (input, expectedUrl, expectedParams) => {
        const tool = await createTool()
        await tool.invoke(input)

        expect(mockGet).toHaveBeenCalledWith(expectedUrl, {
            headers: {
                Accept: 'application/json',
                'X-API-Key': process.env.PATH ?? ''
            },
            params: expectedParams,
            timeout: 15_000
        })
    })

    it.each([
        [{ operation: 'stock_sentiment' }, /symbol is required/],
        [{ operation: 'stock_sentiment', symbol: 'AAPL/USD' }, /Invalid stock ticker/],
        [{ operation: 'crypto_sentiment', symbol: 'BTC/USD' }, /Invalid crypto symbol/],
        [{ operation: 'trending', from: '2026-02-30' }, /YYYY-MM-DD/],
        [{ operation: 'trending', from: '2026-07-01', to: '2026-06-30' }, /from must not be after to/],
        [{ operation: 'trending', limit: 1.5 }, /integer/]
    ])('rejects invalid input %#', async (input, expectedError) => {
        const tool = await createTool()
        await expect(tool.invoke(input)).rejects.toThrow(expectedError)
        expect(mockGet).not.toHaveBeenCalled()
    })

    it('returns JSON for agent consumption', async () => {
        mockGet.mockResolvedValueOnce({ data: [{ ticker: 'AAPL', buzz_score: 88 }] })
        const tool = await createTool()
        await expect(tool.invoke({ operation: 'trending' })).resolves.toBe('[{"ticker":"AAPL","buzz_score":88}]')
    })

    it('reports upstream errors without exposing the request configuration', async () => {
        const upstreamError = {
            message: 'Request failed',
            response: { status: 401, data: { detail: 'Invalid API key' } },
            config: { marker: 'private request metadata' }
        }
        mockIsAxiosError.mockReturnValueOnce(true)
        mockGet.mockRejectedValueOnce(upstreamError)

        const tool = await createTool()
        const message = await tool.invoke({ operation: 'trending' }).catch((error: Error) => error.message)
        expect(message).toBe('Adanos request failed: HTTP 401: Invalid API key')
        expect(message).not.toContain('private request metadata')
    })
})
