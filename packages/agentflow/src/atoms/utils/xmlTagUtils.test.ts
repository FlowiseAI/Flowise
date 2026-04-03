import type { JsonNode } from './xmlTagUtils'
import { escapeXmlTags, getEditorMarkdown, isHtmlContent, restoreTextMentions, unescapeXmlEntities, unescapeXmlTags } from './xmlTagUtils'

// ── isHtmlContent ──────────────────────────────────────────────────────────────

describe('isHtmlContent', () => {
    // Falsy / non-string inputs
    it('returns false for empty string', () => {
        expect(isHtmlContent('')).toBe(false)
    })

    it('returns false for null', () => {
        expect(isHtmlContent(null)).toBe(false)
    })

    it('returns false for undefined', () => {
        expect(isHtmlContent(undefined)).toBe(false)
    })

    it('returns false for a number', () => {
        expect(isHtmlContent(42)).toBe(false)
    })

    // Markdown content (must NOT be detected as HTML)
    it('returns false for plain text', () => {
        expect(isHtmlContent('You are a helpful assistant.')).toBe(false)
    })

    it('returns false for markdown heading', () => {
        expect(isHtmlContent('## My heading')).toBe(false)
    })

    it('returns false for markdown bullet list', () => {
        expect(isHtmlContent('- item 1\n- item 2')).toBe(false)
    })

    it('returns false for markdown with variable syntax', () => {
        expect(isHtmlContent('Hello {{question}}, today is {{current_date_time}}')).toBe(false)
    })

    it('returns false for markdown code fence', () => {
        expect(isHtmlContent('```js\nconsole.log("hello")\n```')).toBe(false)
    })

    it('returns false for markdown bold/italic', () => {
        expect(isHtmlContent('**bold** and *italic* text')).toBe(false)
    })

    // Legacy HTML content (MUST be detected)
    it('returns true for <p> tag', () => {
        expect(isHtmlContent('<p>Hello world</p>')).toBe(true)
    })

    it('returns true for <p> with variable mention span', () => {
        expect(isHtmlContent('<p>Hello <span data-type="mention" data-id="question">{{question}}</span></p>')).toBe(true)
    })

    it('returns true for <h1> heading tag', () => {
        expect(isHtmlContent('<h1>Title</h1>')).toBe(true)
    })

    it('returns true for <h2> heading tag', () => {
        expect(isHtmlContent('<h2>Section</h2>')).toBe(true)
    })

    it('returns true for <ul> list tag', () => {
        expect(isHtmlContent('<ul><li>item</li></ul>')).toBe(true)
    })

    it('returns true for <pre><code> block', () => {
        expect(isHtmlContent('<pre><code>const x = 1</code></pre>')).toBe(true)
    })

    it('returns true for <strong> tag', () => {
        expect(isHtmlContent('<strong>bold</strong>')).toBe(true)
    })

    it('returns true for <em> tag', () => {
        expect(isHtmlContent('<em>italic</em>')).toBe(true)
    })

    it('returns true for <blockquote> tag', () => {
        expect(isHtmlContent('<blockquote>quote</blockquote>')).toBe(true)
    })

    it('returns true for multiline HTML with mixed content', () => {
        expect(isHtmlContent('<p>First paragraph</p>\n<p>Second paragraph</p>')).toBe(true)
    })

    it('returns true for uppercase tag like <P>', () => {
        expect(isHtmlContent('<P>uppercase</P>')).toBe(true)
    })

    // Anchor fix — a user prompt that *contains* a standard HTML tag but does NOT start with one
    it('returns false for a prompt starting with a custom tag that contains HTML inside', () => {
        expect(isHtmlContent('<instructions><div>Test</div></instructions>')).toBe(false)
    })

    it('returns false for a custom XML tag like <instructions>', () => {
        expect(isHtmlContent('<instructions>Be helpful</instructions>')).toBe(false)
    })
})

// ── getEditorMarkdown ──────────────────────────────────────────────────────────

describe('getEditorMarkdown', () => {
    it('returns markdown when getMarkdown() returns a non-empty string', () => {
        const editor = { getMarkdown: () => '## heading', getHTML: () => '<h2>heading</h2>', isEmpty: false }
        expect(getEditorMarkdown(editor)).toBe('## heading')
    })

    it('returns empty string when getMarkdown() returns "" and editor is empty', () => {
        const editor = { getMarkdown: () => '', getHTML: () => '', isEmpty: true }
        expect(getEditorMarkdown(editor)).toBe('')
    })

    it('falls back to HTML when getMarkdown() returns "" but editor is not empty', () => {
        const editor = { getMarkdown: () => '', getHTML: () => '<p>hello</p>', isEmpty: false }
        expect(getEditorMarkdown(editor)).toBe('<p>hello</p>')
    })

    it('falls back to HTML when getMarkdown() throws', () => {
        const editor = {
            getMarkdown: () => {
                throw new Error('serialization failed')
            },
            getHTML: () => '<p>fallback</p>',
            isEmpty: false
        }
        expect(getEditorMarkdown(editor)).toBe('<p>fallback</p>')
    })
})

// ── escapeXmlTags ──────────────────────────────────────────────────────────────

describe('escapeXmlTags', () => {
    it('should escape opening and closing tags to entities', () => {
        expect(escapeXmlTags('<question>text</question>')).toBe('&lt;question&gt;text&lt;/question&gt;')
    })

    it('should escape self-closing tags', () => {
        expect(escapeXmlTags('<my-separator />')).toBe('&lt;my-separator /&gt;')
    })

    it('should escape tags with attributes', () => {
        expect(escapeXmlTags('<context type="user">hello</context>')).toBe('&lt;context type="user"&gt;hello&lt;/context&gt;')
    })

    it('should escape standard HTML tags too', () => {
        expect(escapeXmlTags('<div><p>text</p></div>')).toBe('&lt;div&gt;&lt;p&gt;text&lt;/p&gt;&lt;/div&gt;')
    })

    it('should escape all tags in mixed content', () => {
        const input = '# Heading\n<question>What is {{name}}?</question>\n<p>paragraph</p>'
        const expected = '# Heading\n&lt;question&gt;What is {{name}}?&lt;/question&gt;\n&lt;p&gt;paragraph&lt;/p&gt;'
        expect(escapeXmlTags(input)).toBe(expected)
    })

    it('should handle nested tags', () => {
        const input = '<outer><inner>text</inner></outer>'
        const expected = '&lt;outer&gt;&lt;inner&gt;text&lt;/inner&gt;&lt;/outer&gt;'
        expect(escapeXmlTags(input)).toBe(expected)
    })

    it('should return empty string as-is', () => {
        expect(escapeXmlTags('')).toBe('')
    })

    it('should handle text with no tags', () => {
        expect(escapeXmlTags('just plain text')).toBe('just plain text')
    })

    it('should handle tags with dots and hyphens in names', () => {
        expect(escapeXmlTags('<my.tag>text</my.tag>')).toBe('&lt;my.tag&gt;text&lt;/my.tag&gt;')
        expect(escapeXmlTags('<my-tag>text</my-tag>')).toBe('&lt;my-tag&gt;text&lt;/my-tag&gt;')
    })

    it('should not double-escape already-escaped content', () => {
        const alreadyEscaped = '&lt;question&gt;text&lt;/question&gt;'
        expect(escapeXmlTags(alreadyEscaped)).toBe(alreadyEscaped)
    })
})

// ── unescapeXmlEntities ────────────────────────────────────────────────────────

describe('unescapeXmlEntities', () => {
    it('should unescape entities in text nodes', () => {
        const json = {
            type: 'doc',
            content: [
                {
                    type: 'paragraph',
                    content: [{ type: 'text', text: '&lt;question&gt;What?&lt;/question&gt;' }]
                }
            ]
        }
        unescapeXmlEntities(json)
        expect(json.content[0].content[0].text).toBe('<question>What?</question>')
    })

    it('should unescape standard HTML tag entities too', () => {
        const json = {
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: '&lt;div&gt;content&lt;/div&gt;' }] }]
        }
        unescapeXmlEntities(json)
        expect(json.content[0].content[0].text).toBe('<div>content</div>')
    })

    it('should handle nodes across multiple paragraphs', () => {
        const json = {
            type: 'doc',
            content: [
                { type: 'paragraph', content: [{ type: 'text', text: '&lt;outer&gt;' }] },
                { type: 'paragraph', content: [{ type: 'text', text: '&lt;inner&gt;text&lt;/inner&gt;' }] },
                { type: 'paragraph', content: [{ type: 'text', text: '&lt;/outer&gt;' }] }
            ]
        }
        unescapeXmlEntities(json)
        expect(json.content[0].content[0].text).toBe('<outer>')
        expect(json.content[1].content[0].text).toBe('<inner>text</inner>')
        expect(json.content[2].content[0].text).toBe('</outer>')
    })

    it('should not modify nodes without entities', () => {
        const json = {
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'plain text' }] }]
        }
        unescapeXmlEntities(json)
        expect(json.content[0].content[0].text).toBe('plain text')
    })

    it('should return the same object for chaining', () => {
        const json = { type: 'doc', content: [] }
        expect(unescapeXmlEntities(json)).toBe(json)
    })
})

// ── unescapeXmlTags ────────────────────────────────────────────────────────────

describe('unescapeXmlTags', () => {
    it('should unescape entity-escaped tags', () => {
        expect(unescapeXmlTags('&lt;question&gt;text&lt;/question&gt;')).toBe('<question>text</question>')
    })

    it('should unescape standard HTML tags too', () => {
        expect(unescapeXmlTags('&lt;div&gt;text&lt;/div&gt;')).toBe('<div>text</div>')
    })

    it('should unescape tags with attributes', () => {
        expect(unescapeXmlTags('&lt;context type="user"&gt;hello&lt;/context&gt;')).toBe('<context type="user">hello</context>')
    })

    it('should handle mixed content', () => {
        const input = '# Heading\n&lt;question&gt;text&lt;/question&gt;\nsome markdown'
        const expected = '# Heading\n<question>text</question>\nsome markdown'
        expect(unescapeXmlTags(input)).toBe(expected)
    })

    it('should return empty string as-is', () => {
        expect(unescapeXmlTags('')).toBe('')
    })

    it('should pass through raw (unescaped) tags unchanged', () => {
        expect(unescapeXmlTags('<question>text</question>')).toBe('<question>text</question>')
    })
})

// ── roundtrip — escape → unescape ─────────────────────────────────────────────

describe('roundtrip — escape → unescape', () => {
    const cases = [
        '<question>What is the answer?</question>',
        '<context type="system">You are helpful</context>',
        '<instructions>\n- Step 1\n- Step 2\n</instructions>',
        '<outer><inner>nested</inner></outer>',
        '# Title\n<question>{{input}}</question>\n**bold** text',
        '<my-component />',
        'No tags here, just **markdown**',
        '<div>standard html preserved</div>'
    ]

    cases.forEach((input) => {
        it(`should roundtrip: ${input.substring(0, 50)}`, () => {
            expect(unescapeXmlTags(escapeXmlTags(input))).toBe(input)
        })
    })
})

// ── markdown formatting preservation ──────────────────────────────────────────

describe('markdown formatting preservation', () => {
    it('should preserve heading syntax', () => {
        const input = '## My Task\nDo something useful'
        expect(escapeXmlTags(input)).toBe(input)
        expect(unescapeXmlTags(input)).toBe(input)
    })

    it('should preserve bold and italic syntax', () => {
        const input = 'This is **bold** and *italic* and ***both***'
        expect(escapeXmlTags(input)).toBe(input)
        expect(unescapeXmlTags(input)).toBe(input)
    })

    it('should preserve code blocks', () => {
        const input = '```python\nprint("hello")\n```'
        expect(escapeXmlTags(input)).toBe(input)
        expect(unescapeXmlTags(input)).toBe(input)
    })

    it('should preserve markdown links', () => {
        const input = 'See [the docs](https://example.com/path?q=1) for details'
        expect(escapeXmlTags(input)).toBe(input)
        expect(unescapeXmlTags(input)).toBe(input)
    })

    it('should roundtrip HTML anchor links', () => {
        const input = 'Visit <a href="https://flowiseai.com">Flowise</a> for docs'
        expect(unescapeXmlTags(escapeXmlTags(input))).toBe(input)
    })
})

// ── full editor save/reload cycle simulation ───────────────────────────────────

describe('full editor save/reload cycle simulation', () => {
    /**
     * Simulates the load → display → save cycle:
     *   LOAD:  escapeXmlTags(value) → setContent(markdown) → unescapeXmlEntities(json) → setContent(json)
     *   SAVE:  getMarkdown() → unescapeXmlTags(markdown)
     */
    function simulateEditorCycle(userInput: string): string {
        // LOAD — Step 1: escape tags so marked treats them as text
        const escaped = escapeXmlTags(userInput)
        // LOAD — Step 2: marked creates text nodes with entities; unescapeXmlEntities fixes them
        const mockJson = {
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: escaped }] }]
        }
        unescapeXmlEntities(mockJson)
        // Verify editor displays raw angle brackets (no entities remain)
        const displayText = mockJson.content[0].content[0].text
        expect(displayText).not.toMatch(/&lt;|&gt;/)
        // SAVE — getMarkdown() outputs text as-is; unescapeXmlTags is the safety net
        return unescapeXmlTags(displayText)
    }

    it('should preserve XML-tagged prompt', () => {
        expect(simulateEditorCycle('<question>What is the answer?</question>')).toBe('<question>What is the answer?</question>')
    })

    it('should preserve tags with attributes', () => {
        expect(simulateEditorCycle('<context type="system">You are helpful</context>')).toBe(
            '<context type="system">You are helpful</context>'
        )
    })

    it('should preserve multiline structured prompt', () => {
        expect(simulateEditorCycle('<instructions>\n- Step 1\n- Step 2\n</instructions>')).toBe(
            '<instructions>\n- Step 1\n- Step 2\n</instructions>'
        )
    })

    it('should preserve XML tags mixed with markdown and variables', () => {
        expect(simulateEditorCycle('# Title\n<question>{{input}}</question>\n**bold** text')).toBe(
            '# Title\n<question>{{input}}</question>\n**bold** text'
        )
    })

    it('should leave plain markdown unchanged', () => {
        expect(simulateEditorCycle('No tags here, just **markdown**')).toBe('No tags here, just **markdown**')
    })
})

// ── restoreTextMentions ────────────────────────────────────────────────────────

describe('restoreTextMentions', () => {
    describe('hasMentions: false — XML unescape only', () => {
        it('unescapes XML entities in a text node', () => {
            const node: JsonNode = { type: 'text', text: '&lt;instructions&gt;hello&lt;/instructions&gt;' }
            const result = restoreTextMentions(node, false)
            expect(result).toEqual([{ type: 'text', text: '<instructions>hello</instructions>' }])
        })

        it('returns plain text unchanged', () => {
            const node: JsonNode = { type: 'text', text: 'hello world' }
            expect(restoreTextMentions(node, false)).toEqual([{ type: 'text', text: 'hello world' }])
        })

        it('does not split {{variable}} patterns when hasMentions is false', () => {
            const node: JsonNode = { type: 'text', text: 'Hello {{question}}' }
            expect(restoreTextMentions(node, false)).toEqual([{ type: 'text', text: 'Hello {{question}}' }])
        })
    })

    describe('hasMentions: true — splits {{variable}} into mention nodes', () => {
        it('converts a lone {{variable}} into a mention node', () => {
            const node: JsonNode = { type: 'text', text: '{{question}}' }
            const result = restoreTextMentions(node, true)
            expect(result).toEqual([{ type: 'mention', attrs: { id: 'question', label: 'question' } }])
        })

        it('splits text before a {{variable}} into a text node + mention', () => {
            const node: JsonNode = { type: 'text', text: 'Hello {{name}}' }
            const result = restoreTextMentions(node, true)
            expect(result).toEqual([
                { type: 'text', text: 'Hello ' },
                { type: 'mention', attrs: { id: 'name', label: 'name' } }
            ])
        })

        it('splits text after a {{variable}} into mention + text node', () => {
            const node: JsonNode = { type: 'text', text: '{{name}} is here' }
            const result = restoreTextMentions(node, true)
            expect(result).toEqual([
                { type: 'mention', attrs: { id: 'name', label: 'name' } },
                { type: 'text', text: ' is here' }
            ])
        })

        it('handles multiple {{variables}} in one text node', () => {
            const node: JsonNode = { type: 'text', text: '{{a}} and {{b}}' }
            const result = restoreTextMentions(node, true)
            expect(result).toEqual([
                { type: 'mention', attrs: { id: 'a', label: 'a' } },
                { type: 'text', text: ' and ' },
                { type: 'mention', attrs: { id: 'b', label: 'b' } }
            ])
        })

        it('trims whitespace inside {{  variable  }}', () => {
            const node: JsonNode = { type: 'text', text: '{{  question  }}' }
            const result = restoreTextMentions(node, true)
            expect(result).toEqual([{ type: 'mention', attrs: { id: 'question', label: 'question' } }])
        })

        it('restores mention inside a URL text node', () => {
            // This is the core bug fix — MarkedJS URL tokenizer swallows {{var}} inside URLs
            const node: JsonNode = { type: 'text', text: 'https://example.com/{{question}}' }
            const result = restoreTextMentions(node, true)
            expect(result).toEqual([
                { type: 'text', text: 'https://example.com/' },
                { type: 'mention', attrs: { id: 'question', label: 'question' } }
            ])
        })

        it('unescapes XML entities AND restores mentions together', () => {
            const node: JsonNode = { type: 'text', text: '&lt;context&gt;{{question}}&lt;/context&gt;' }
            const result = restoreTextMentions(node, true)
            expect(result).toEqual([
                { type: 'text', text: '<context>' },
                { type: 'mention', attrs: { id: 'question', label: 'question' } },
                { type: 'text', text: '</context>' }
            ])
        })
    })

    describe('recursive tree walking', () => {
        it('walks content arrays and processes nested text nodes', () => {
            const doc: JsonNode = {
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Visit https://example.com/{{question}}' }]
                    }
                ]
            }
            const [result] = restoreTextMentions(doc, true)
            const para = (result.content as JsonNode[])[0]
            expect(para.content).toEqual([
                { type: 'text', text: 'Visit https://example.com/' },
                { type: 'mention', attrs: { id: 'question', label: 'question' } }
            ])
        })

        it('passes through non-text, non-content nodes unchanged', () => {
            const node: JsonNode = { type: 'hardBreak' }
            expect(restoreTextMentions(node, true)).toEqual([{ type: 'hardBreak' }])
        })
    })
})
