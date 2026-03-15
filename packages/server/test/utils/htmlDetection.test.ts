/**
 * Tests for HTML detection used in buildAgentflow.ts to decide
 * whether to apply TurndownService (HTML-to-Markdown converter).
 *
 * Prevents Markdown characters from being escaped when input is plain text.
 * See: https://github.com/FlowiseAI/Flowise/issues/5527
 */

const HTML_TAG_REGEX = /<[a-z][\s\S]*>/i

describe('HTML detection for TurndownService guard', () => {
    it('detects HTML tags', () => {
        expect(HTML_TAG_REGEX.test('<p>Hello</p>')).toBe(true)
        expect(HTML_TAG_REGEX.test('<div class="test">content</div>')).toBe(true)
        expect(HTML_TAG_REGEX.test('<br>')).toBe(true)
        expect(HTML_TAG_REGEX.test('<br/>')).toBe(true)
        expect(HTML_TAG_REGEX.test('<h1>Title</h1>')).toBe(true)
        expect(HTML_TAG_REGEX.test('Some text <b>bold</b> more text')).toBe(true)
    })

    it('does not match plain Markdown text', () => {
        expect(HTML_TAG_REGEX.test('## Heading')).toBe(false)
        expect(HTML_TAG_REGEX.test('**bold text**')).toBe(false)
        expect(HTML_TAG_REGEX.test('- list item')).toBe(false)
        expect(HTML_TAG_REGEX.test('1. numbered item')).toBe(false)
        expect(HTML_TAG_REGEX.test('`inline code`')).toBe(false)
        expect(HTML_TAG_REGEX.test('[link](http://example.com)')).toBe(false)
    })

    it('does not match plain text', () => {
        expect(HTML_TAG_REGEX.test('Hello world')).toBe(false)
        expect(HTML_TAG_REGEX.test('You are a helpful assistant')).toBe(false)
        expect(HTML_TAG_REGEX.test('')).toBe(false)
    })

    it('does not match template variables', () => {
        expect(HTML_TAG_REGEX.test('{{$flow.question}}')).toBe(false)
        expect(HTML_TAG_REGEX.test('Answer: {{node_0.output}}')).toBe(false)
    })
})
