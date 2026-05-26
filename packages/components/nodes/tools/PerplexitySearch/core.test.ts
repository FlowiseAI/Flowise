import { secureFetch } from '../../../src/httpSecurity'
import packageJson from '../../../package.json'
import { PerplexitySearchTool } from './core'

jest.mock('../../../src/httpSecurity', () => ({
    secureFetch: jest.fn()
}))

const mockedSecureFetch = secureFetch as jest.MockedFunction<typeof secureFetch>

describe('PerplexitySearchTool', () => {
    beforeEach(() => {
        jest.resetAllMocks()
    })

    it('sends the Flowise integration attribution header', async () => {
        mockedSecureFetch.mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({ results: [] })
        } as unknown as Awaited<ReturnType<typeof secureFetch>>)

        const tool = new PerplexitySearchTool({ apiKey: 'test-key' })

        await tool._call({ query: 'latest ai news' })

        expect(mockedSecureFetch).toHaveBeenCalledWith(
            'https://api.perplexity.ai/search',
            expect.objectContaining({
                headers: expect.objectContaining({
                    'X-Pplx-Integration': expect.stringMatching(/^flowise\//)
                })
            })
        )

        const headers = mockedSecureFetch.mock.calls[0]?.[1]?.headers as Record<string, string>
        expect(headers['X-Pplx-Integration']).toBe(`flowise/${packageJson.version}`)
    })
})
