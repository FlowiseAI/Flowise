// Mock @langchain/core/tools before any import that pulls it in
jest.mock('@langchain/core/tools', () => {
    class MockTool {
        name = ''
        description = ''
    }
    return { Tool: MockTool }
})

// Mock utils to avoid pulling in more dependencies
jest.mock('../../../../src/utils', () => ({
    getBaseClasses: jest.fn().mockReturnValue(['Tool']),
    getCredentialData: jest.fn(),
    getCredentialParam: jest.fn()
}))

// Mock seltz SDK
jest.mock('seltz', () => ({
    Seltz: jest.fn()
}))

const { SeltzSearchTool } = require('../../../../nodes/tools/SeltzSearch/SeltzSearch')

describe('SeltzSearchTool', () => {
    let mockSearch: jest.Mock

    beforeEach(() => {
        jest.clearAllMocks()
        mockSearch = jest.fn()
        const { Seltz } = require('seltz')
        ;(Seltz as jest.Mock).mockImplementation(() => ({
            search: mockSearch
        }))
    })

    describe('constructor', () => {
        it('should create tool with required properties', () => {
            const tool = new SeltzSearchTool({ apiKey: 'test-key' })
            expect(tool.name).toBe('seltz-search')
            expect(tool.description).toContain('context-engineered web search tool powered by Seltz')
        })
    })

    describe('_call', () => {
        it('should return formatted results on successful search', async () => {
            mockSearch.mockResolvedValue({
                documents: [
                    { url: 'https://example.com/1', content: 'First result content' },
                    { url: 'https://example.com/2', content: 'Second result content' }
                ]
            })

            const tool = new SeltzSearchTool({ apiKey: 'test-key' })
            const result = await tool._call('test query')

            const parsed = JSON.parse(result)
            expect(parsed).toHaveLength(2)
            expect(parsed[0]).toEqual({ url: 'https://example.com/1', content: 'First result content' })
            expect(parsed[1]).toEqual({ url: 'https://example.com/2', content: 'Second result content' })
        })

        it('should return "No results found." when no documents', async () => {
            mockSearch.mockResolvedValue({ documents: [] })

            const tool = new SeltzSearchTool({ apiKey: 'test-key' })
            const result = await tool._call('no results query')

            expect(result).toBe('No results found.')
        })

        it('should handle documents with missing fields', async () => {
            mockSearch.mockResolvedValue({
                documents: [{ url: undefined, content: undefined }]
            })

            const tool = new SeltzSearchTool({ apiKey: 'test-key' })
            const result = await tool._call('partial query')

            const parsed = JSON.parse(result)
            expect(parsed[0]).toEqual({ url: '', content: '' })
        })

        it('should pass maxDocuments option when configured', async () => {
            mockSearch.mockResolvedValue({ documents: [] })

            const tool = new SeltzSearchTool({ apiKey: 'test-key', maxDocuments: 5 })
            await tool._call('test')

            expect(mockSearch).toHaveBeenCalledWith('test', {
                includes: { maxDocuments: 5 }
            })
        })

        it('should pass context and profile options when configured', async () => {
            mockSearch.mockResolvedValue({ documents: [] })

            const tool = new SeltzSearchTool({
                apiKey: 'test-key',
                context: 'AI tools',
                profile: 'technical'
            })
            await tool._call('test')

            expect(mockSearch).toHaveBeenCalledWith('test', {
                context: 'AI tools',
                profile: 'technical'
            })
        })

        it('should pass all options together when configured', async () => {
            mockSearch.mockResolvedValue({ documents: [] })

            const tool = new SeltzSearchTool({
                apiKey: 'test-key',
                maxDocuments: 3,
                context: 'AI tools',
                profile: 'technical'
            })
            await tool._call('test')

            expect(mockSearch).toHaveBeenCalledWith('test', {
                includes: { maxDocuments: 3 },
                context: 'AI tools',
                profile: 'technical'
            })
        })

        it('should not pass options when none are configured', async () => {
            mockSearch.mockResolvedValue({ documents: [] })

            const tool = new SeltzSearchTool({ apiKey: 'test-key' })
            await tool._call('test')

            expect(mockSearch).toHaveBeenCalledWith('test', undefined)
        })

        it('should propagate errors from the SDK', async () => {
            mockSearch.mockRejectedValue(new Error('API Error'))

            const tool = new SeltzSearchTool({ apiKey: 'test-key' })
            await expect(tool._call('test')).rejects.toThrow('API Error')
        })
    })
})
