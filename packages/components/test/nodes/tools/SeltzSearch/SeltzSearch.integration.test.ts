/**
 * Integration test for SeltzSearch tool.
 * Requires SELTZ_API_KEY environment variable to be set.
 * Run with: SELTZ_API_KEY=your-key npx jest --testPathPattern=SeltzSearch.integration
 */

export {}

// Mock @langchain/core/tools to avoid ESM issues in Jest
jest.mock('@langchain/core/tools', () => {
    class MockTool {
        name = ''
        description = ''
    }
    return { Tool: MockTool }
})

jest.mock('../../../../src/utils', () => ({
    getBaseClasses: jest.fn().mockReturnValue(['Tool']),
    getCredentialData: jest.fn(),
    getCredentialParam: jest.fn()
}))

const { SeltzSearchTool } = require('../../../../nodes/tools/SeltzSearch/SeltzSearch')

const SELTZ_API_KEY = process.env.SELTZ_API_KEY

const describeIfKey = SELTZ_API_KEY ? describe : describe.skip

describeIfKey('SeltzSearchTool Integration', () => {
    it('should return search results for a basic query', async () => {
        const tool = new SeltzSearchTool({ apiKey: SELTZ_API_KEY! })
        const result = await tool._call('What is Flowise AI?')

        const parsed = JSON.parse(result)
        expect(Array.isArray(parsed)).toBe(true)
        expect(parsed.length).toBeGreaterThan(0)
        expect(parsed[0]).toHaveProperty('url')
        expect(parsed[0]).toHaveProperty('content')
        expect(parsed[0].url).toMatch(/^https?:\/\//)
        expect(parsed[0].content.length).toBeGreaterThan(0)
    }, 30000)

    it('should respect maxDocuments option', async () => {
        const tool = new SeltzSearchTool({ apiKey: SELTZ_API_KEY!, maxDocuments: 3 })
        const result = await tool._call('TypeScript programming')

        const parsed = JSON.parse(result)
        expect(parsed.length).toBeLessThanOrEqual(3)
        expect(parsed.length).toBeGreaterThan(0)
    }, 30000)

    it('should work with context option', async () => {
        const tool = new SeltzSearchTool({
            apiKey: SELTZ_API_KEY!,
            context: 'open source AI workflow tools',
            maxDocuments: 5
        })
        const result = await tool._call('low-code AI automation')

        const parsed = JSON.parse(result)
        expect(Array.isArray(parsed)).toBe(true)
        expect(parsed.length).toBeGreaterThan(0)
    }, 30000)
})
