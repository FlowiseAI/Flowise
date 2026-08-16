import { MAX_SNIPPET_CHARS, resultSnippet } from './resultSnippet'

describe('resultSnippet', () => {
    it('reads the text from `snippet`', () => {
        // A realistic result: the API returns both fields, `description` is
        // frequently empty and `snippet` carries the page text.
        expect(resultSnippet({ description: '', snippet: 'First page text' })).toBe('First page text')
    })

    it('falls back to `description` when `snippet` is absent', () => {
        expect(resultSnippet({ description: 'A description' })).toBe('A description')
    })

    it('returns an empty string when both are missing', () => {
        expect(resultSnippet({})).toBe('')
    })

    it('collapses whitespace', () => {
        // Snippets arrive as raw page text, newlines included.
        expect(resultSnippet({ snippet: 'line one\n\nline  two\t' })).toBe('line one line two')
    })

    it('caps the length', () => {
        const snippet = resultSnippet({ snippet: 'padding '.repeat(500) })

        expect(snippet).toHaveLength(MAX_SNIPPET_CHARS)
    })
})
