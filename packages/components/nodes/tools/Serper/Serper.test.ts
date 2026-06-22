// Mock node-fetch before any imports
jest.mock('node-fetch', () => jest.fn())
import fetch from 'node-fetch'
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

// Mock Flowise utility functions
jest.mock('../../../src/utils', () => ({
    getBaseClasses: jest.fn(() => ['Serper', 'Tool', 'StructuredTool']),
    getCredentialData: jest.fn(() => Promise.resolve({ serperApiKey: 'test-api-key-123' })),
    getCredentialParam: jest.fn((paramName: string, credentialData: any) => credentialData[paramName])
}))

import { SerperTool, SerperConfig, SERPER_ENDPOINTS } from './core'

let Serper_Tools: any
beforeAll(async () => {
    const mod = await import('./Serper')
    Serper_Tools = (mod as any).default?.nodeClass ?? require('./Serper').nodeClass
})

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeNodeData(inputs: Record<string, any> = {}) {
    return {
        id: 'test-node-id',
        label: 'Serper',
        name: 'serper',
        type: 'Serper',
        icon: 'serper.svg',
        version: 2.0,
        category: 'Tools',
        baseClasses: ['Serper', 'Tool'],
        credential: 'mock-credential-id',
        inputs: { endpoint: 'search', ...inputs }
    }
}

function mockOkResponse(body: any) {
    mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => body,
        text: async () => JSON.stringify(body)
    } as any)
}

function mockErrorResponse(status: number, text: string) {
    mockFetch.mockResolvedValueOnce({
        ok: false,
        status,
        statusText: text,
        text: async () => text,
        json: async () => ({ error: text })
    } as any)
}

// ─── Node Structure Tests ──────────────────────────────────────────────────────

describe('Serper_Tools Node Structure', () => {
    let node: any

    beforeEach(() => {
        node = new Serper_Tools()
    })

    it('has correct metadata', () => {
        expect(node.label).toBe('Serper')
        expect(node.name).toBe('serper')
        expect(node.type).toBe('Serper')
        expect(node.icon).toBe('serper.svg')
        expect(node.category).toBe('Tools')
        expect(node.version).toBe(2.0)
    })

    it('uses serperApi credential', () => {
        expect(node.credential.type).toBe('credential')
        expect(node.credential.credentialNames).toContain('serperApi')
    })

    it('has endpoint as first input', () => {
        expect(node.inputs[0].name).toBe('endpoint')
        expect(node.inputs[0].type).toBe('options')
        expect(node.inputs[0].default).toBe('search')
    })

    it('exposes all 11 Serper endpoints in the endpoint input', () => {
        const endpointInput = node.inputs.find((i: any) => i.name === 'endpoint')
        const optionNames = endpointInput.options.map((o: any) => o.name)
        for (const ep of SERPER_ENDPOINTS) {
            expect(optionNames).toContain(ep)
        }
    })

    it('has all expected optional inputs', () => {
        const inputNames = node.inputs.map((i: any) => i.name)
        expect(inputNames).toContain('gl')
        expect(inputNames).toContain('hl')
        expect(inputNames).toContain('num')
        expect(inputNames).toContain('page')
        expect(inputNames).toContain('tbs')
        expect(inputNames).toContain('location')
        expect(inputNames).toContain('autocorrect')
        expect(inputNames).toContain('imgar')
        expect(inputNames).toContain('imgtype')
        expect(inputNames).toContain('ll')
    })

    it('marks optional inputs as additionalParams', () => {
        const optionalInputs = node.inputs.filter((i: any) => i.name !== 'endpoint')
        for (const input of optionalInputs) {
            expect(input.additionalParams).toBe(true)
            expect(input.optional).toBe(true)
        }
    })

    it('has non-empty baseClasses', () => {
        expect(node.baseClasses.length).toBeGreaterThan(0)
    })

    it('has correct imgar options', () => {
        const imgarInput = node.inputs.find((i: any) => i.name === 'imgar')
        const imgarValues = imgarInput.options.map((o: any) => o.name)
        expect(imgarValues).toContain('')
        expect(imgarValues).toContain('t')
        expect(imgarValues).toContain('w')
        expect(imgarValues).toContain('s')
        expect(imgarValues).toContain('xw')
    })

    it('has correct imgtype options', () => {
        const imgtypeInput = node.inputs.find((i: any) => i.name === 'imgtype')
        const values = imgtypeInput.options.map((o: any) => o.name)
        expect(values).toContain('')
        expect(values).toContain('photo')
        expect(values).toContain('face')
        expect(values).toContain('clipart')
        expect(values).toContain('lineart')
        expect(values).toContain('animated')
    })
})

// ─── Node Init Tests ───────────────────────────────────────────────────────────

describe('Serper_Tools.init()', () => {
    let node: any

    beforeEach(() => {
        jest.clearAllMocks()
        node = new Serper_Tools()
    })

    it('returns a SerperTool instance', async () => {
        const tool = await node.init(makeNodeData(), '', {})
        expect(tool).toBeInstanceOf(SerperTool)
    })

    it('creates tool with default search endpoint when no endpoint specified', async () => {
        const tool = await node.init(makeNodeData({}), '', {})
        expect(tool.name).toBe('serper_search')
    })

    it.each(SERPER_ENDPOINTS)('creates correct tool for endpoint: %s', async (endpoint) => {
        const tool = await node.init(makeNodeData({ endpoint }), '', {})
        expect(tool.name).toBe(`serper_${endpoint}`)
    })

    it('passes gl and hl to the tool config', async () => {
        const tool = await node.init(makeNodeData({ gl: 'de', hl: 'de' }), '', {})
        mockOkResponse({ organic: [{ title: 'Test', snippet: 'Snippet', link: 'http://test.com' }] })
        await tool._call('test query')
        expect(mockFetch).toHaveBeenCalledWith(
            'https://google.serper.dev/search',
            expect.objectContaining({
                body: expect.stringContaining('"gl":"de"')
            })
        )
    })

    it('passes num parameter to the tool config', async () => {
        const tool = await node.init(makeNodeData({ num: 20 }), '', {})
        mockOkResponse({ organic: [{ title: 'Test', snippet: 'Snippet', link: 'http://test.com' }] })
        await tool._call('test query')
        expect(mockFetch).toHaveBeenCalledWith(
            'https://google.serper.dev/search',
            expect.objectContaining({
                body: expect.stringContaining('"num":20')
            })
        )
    })

    it('passes tbs string directly to API', async () => {
        const tool = await node.init(makeNodeData({ tbs: 'qdr:w' }), '', {})
        mockOkResponse({ organic: [] })
        await tool._call('test')
        expect(mockFetch).toHaveBeenCalledWith(
            'https://google.serper.dev/search',
            expect.objectContaining({
                body: expect.stringContaining('"tbs":"qdr:w"')
            })
        )
    })

    it('passes custom date range tbs to API', async () => {
        const tool = await node.init(makeNodeData({ tbs: 'cdr:1,cd_min:01/01/2024,cd_max:06/30/2024' }), '', {})
        mockOkResponse({ organic: [] })
        await tool._call('test')
        expect(mockFetch).toHaveBeenCalledWith(
            'https://google.serper.dev/search',
            expect.objectContaining({
                body: expect.stringContaining('cdr:1')
            })
        )
    })

    it('passes imgtype to API for images endpoint', async () => {
        const tool = await node.init(makeNodeData({ endpoint: 'images', imgtype: 'photo' }), '', {})
        mockOkResponse({ images: [] })
        await tool._call('test')
        expect(mockFetch).toHaveBeenCalledWith(
            'https://google.serper.dev/images',
            expect.objectContaining({
                body: expect.stringContaining('"imgtype":"photo"')
            })
        )
    })
})

// ─── SerperTool Core Tests ─────────────────────────────────────────────────────

describe('SerperTool', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('sets name based on endpoint', () => {
        const tool = new SerperTool({ apiKey: 'key', endpoint: 'news' })
        expect(tool.name).toBe('serper_news')
    })

    it.each(SERPER_ENDPOINTS)('has a description for endpoint: %s', (endpoint) => {
        const tool = new SerperTool({ apiKey: 'key', endpoint })
        expect(tool.description).toBeTruthy()
        expect(tool.description.length).toBeGreaterThan(10)
    })

    it('calls the correct Serper endpoint URL', async () => {
        mockOkResponse({ organic: [] })
        const tool = new SerperTool({ apiKey: 'key', endpoint: 'news' })
        await tool._call('latest news')
        expect(mockFetch).toHaveBeenCalledWith('https://google.serper.dev/news', expect.any(Object))
    })

    it('sends X-API-KEY header', async () => {
        mockOkResponse({ organic: [] })
        const tool = new SerperTool({ apiKey: 'my-secret-key', endpoint: 'search' })
        await tool._call('test')
        expect(mockFetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                headers: expect.objectContaining({ 'X-API-KEY': 'my-secret-key' })
            })
        )
    })

    it('throws on HTTP error', async () => {
        mockErrorResponse(401, 'Unauthorized')
        const tool = new SerperTool({ apiKey: 'bad-key', endpoint: 'search' })
        await expect(tool._call('test')).rejects.toThrow('401')
    })

    it('returns answerBox.answer when present', async () => {
        mockOkResponse({ answerBox: { answer: '42' }, organic: [] })
        const tool = new SerperTool({ apiKey: 'key', endpoint: 'search' })
        const result = await tool._call('what is 6x7')
        expect(result).toBe('42')
    })

    it('returns knowledgeGraph description when no answerBox', async () => {
        mockOkResponse({ knowledgeGraph: { description: 'Paris is the capital of France.' }, organic: [] })
        const tool = new SerperTool({ apiKey: 'key', endpoint: 'search' })
        const result = await tool._call('Paris')
        expect(result).toBe('Paris is the capital of France.')
    })

    it('formats organic results correctly', async () => {
        mockOkResponse({
            organic: [
                { title: 'Result 1', snippet: 'Snippet 1', link: 'https://example.com/1' },
                { title: 'Result 2', snippet: 'Snippet 2', link: 'https://example.com/2' }
            ]
        })
        const tool = new SerperTool({ apiKey: 'key', endpoint: 'search' })
        const result = await tool._call('test')
        expect(result).toContain('[1]')
        expect(result).toContain('Result 1')
        expect(result).toContain('[2]')
        expect(result).toContain('https://example.com/2')
    })

    it('handles scrape endpoint with separate URL', async () => {
        mockOkResponse({ text: 'Page content here' })
        const tool = new SerperTool({ apiKey: 'key', endpoint: 'scrape' })
        const result = await tool._call('https://example.com')
        expect(mockFetch).toHaveBeenCalledWith('https://scrape.serper.dev', expect.any(Object))
        expect(result).toBe('Page content here')
    })

    it('returns autocomplete suggestions as newline-separated list', async () => {
        mockOkResponse({ suggestions: [{ value: 'hello world' }, { value: 'hello kitty' }] })
        const tool = new SerperTool({ apiKey: 'key', endpoint: 'autocomplete' })
        const result = await tool._call('hello')
        expect(result).toBe('hello world\nhello kitty')
    })

    it('falls back to JSON when no structured data', async () => {
        const raw = { someUnknownField: 'value' }
        mockOkResponse(raw)
        const tool = new SerperTool({ apiKey: 'key', endpoint: 'search' })
        const result = await tool._call('obscure query')
        expect(result).toBe(JSON.stringify(raw))
    })

    it('formats news results with date and source', async () => {
        mockOkResponse({
            news: [{ title: 'Breaking News', snippet: 'Details...', link: 'https://news.com/1', date: '1 hour ago', source: 'CNN' }]
        })
        const tool = new SerperTool({ apiKey: 'key', endpoint: 'news' })
        const result = await tool._call('breaking news')
        expect(result).toContain('Breaking News')
        expect(result).toContain('Date: 1 hour ago')
        expect(result).toContain('Source: CNN')
    })

    it('formats shopping results with price', async () => {
        mockOkResponse({
            shopping: [{ title: 'Widget', price: '$9.99', source: 'Amazon', link: 'https://amazon.com/w' }]
        })
        const tool = new SerperTool({ apiKey: 'key', endpoint: 'shopping' })
        const result = await tool._call('widget')
        expect(result).toContain('Price: $9.99')
    })

    it('formats scholar results with citation count', async () => {
        mockOkResponse({
            organic: [{ title: 'A Study', snippet: 'Abstract...', link: 'https://scholar.com/1', publicationInfo: 'Nature 2023', citedBy: 42 }]
        })
        const tool = new SerperTool({ apiKey: 'key', endpoint: 'scholar' })
        const result = await tool._call('machine learning')
        expect(result).toContain('Publication: Nature 2023')
        expect(result).toContain('Cited by: 42')
    })

    it('formats places results with address and rating', async () => {
        mockOkResponse({
            places: [{ title: 'Cafe Central', address: '1 Main St', rating: 4.5, ratingCount: 200 }]
        })
        const tool = new SerperTool({ apiKey: 'key', endpoint: 'places' })
        const result = await tool._call('cafe near me')
        expect(result).toContain('Address: 1 Main St')
        expect(result).toContain('Rating: 4.5 (200 reviews)')
    })

    it('formats patent results with inventor and assignee', async () => {
        mockOkResponse({
            organic: [{ title: 'Patent #1', snippet: 'A device...', link: 'https://patents.google.com/1', priorityDate: '2020-01-01', inventor: 'Jane Doe', assignee: 'ACME Corp' }]
        })
        const tool = new SerperTool({ apiKey: 'key', endpoint: 'patents' })
        const result = await tool._call('wireless device')
        expect(result).toContain('Inventor: Jane Doe')
        expect(result).toContain('Assignee: ACME Corp')
    })
})
