import { extractToolCalls, resolveTool } from './tools'

describe('resolveTool', () => {
    it('returns the matched toolNode display fields when a name matches', () => {
        const tools = [{ name: 'search', toolNode: { name: 'searchNode', label: 'Search' } }]
        expect(resolveTool('search', tools)).toEqual({ iconName: 'searchNode', label: 'Search' })
    })

    it('falls back to the raw name when no match is found', () => {
        expect(resolveTool('unknown', [])).toEqual({ iconName: 'unknown', label: 'unknown' })
        expect(resolveTool('unknown', undefined)).toEqual({ iconName: 'unknown', label: 'unknown' })
    })

    it('falls back to the raw name when toolNode display fields are missing', () => {
        const tools = [{ name: 'search' }]
        expect(resolveTool('search', tools)).toEqual({ iconName: 'search', label: 'search' })
    })
})

describe('extractToolCalls', () => {
    it('returns the OpenAI-style tool_calls array (preserving raw)', () => {
        const result = extractToolCalls({
            tool_calls: [{ name: 'search', args: { q: 'x' } }, { name: 'lookup' }]
        })
        expect(result.calls).toHaveLength(2)
        expect(result.calls[0].name).toBe('search')
        expect(result.calls[1].name).toBe('lookup')
        expect(result.suppressContent).toBe(false)
    })

    it('falls back to "Tool Call" when an OpenAI-style entry has no name', () => {
        const result = extractToolCalls({ tool_calls: [{ args: {} }] })
        expect(result.calls).toHaveLength(1)
        expect(result.calls[0].name).toBe('Tool Call')
    })

    it('filters out non-object entries from tool_calls', () => {
        const result = extractToolCalls({ tool_calls: ['oops', null, { name: 'good' }] })
        expect(result.calls).toHaveLength(1)
        expect(result.calls[0].name).toBe('good')
    })

    it('suppressContent=true when content carries the same calls in Gemini shape', () => {
        const result = extractToolCalls({
            tool_calls: [{ name: 'search' }],
            content: [{ type: 'functionCall', functionCall: { name: 'search' } }]
        })
        expect(result.suppressContent).toBe(true)
    })

    it('extracts Gemini-style functionCall items from content when tool_calls is empty', () => {
        const result = extractToolCalls({
            content: [{ type: 'functionCall', functionCall: { name: 'lookup' } }]
        })
        expect(result.calls).toHaveLength(1)
        expect(result.calls[0].name).toBe('lookup')
        expect(result.suppressContent).toBe(true)
    })

    it('keeps text portion visible when content mixes functionCalls + plain items', () => {
        const result = extractToolCalls({
            content: [
                { type: 'text', text: 'reply' },
                { type: 'functionCall', functionCall: { name: 'lookup' } }
            ]
        })
        expect(result.calls).toHaveLength(1)
        expect(result.suppressContent).toBe(false)
    })

    it('returns no calls when neither shape carries any', () => {
        expect(extractToolCalls({})).toEqual({ calls: [], suppressContent: false })
        expect(extractToolCalls({ content: 'plain' })).toEqual({ calls: [], suppressContent: false })
    })

    it('falls back to "Tool Call" when a Gemini functionCall has no name', () => {
        const result = extractToolCalls({
            content: [{ type: 'functionCall', functionCall: {} }]
        })
        expect(result.calls).toHaveLength(1)
        expect(result.calls[0].name).toBe('Tool Call')
    })
})
