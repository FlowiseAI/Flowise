import { isHtmlContent, escapeXmlTags, unescapeXmlEntities, unescapeXmlTags } from './xmlTagUtils'

describe('xmlTagUtils', () => {
    describe('isHtmlContent', () => {
        it('should detect legacy getHTML() output starting with <p>', () => {
            expect(isHtmlContent('<p>some text</p>')).toBe(true)
        })

        it('should detect legacy output starting with <div>', () => {
            expect(isHtmlContent('<div>content</div>')).toBe(true)
        })

        it('should detect legacy output with leading whitespace', () => {
            expect(isHtmlContent('  <p>text</p>')).toBe(true)
        })

        it('should NOT detect user prompts starting with custom tags', () => {
            expect(isHtmlContent('<instruction>Help me</instruction>')).toBe(false)
        })

        it('should NOT detect prompts that contain HTML tags mid-content', () => {
            expect(isHtmlContent('<instruction><div>Test</div></instruction>')).toBe(false)
        })

        it('should return false for plain text', () => {
            expect(isHtmlContent('just plain text')).toBe(false)
        })

        it('should return false for empty/null/undefined', () => {
            expect(isHtmlContent('')).toBe(false)
            expect(isHtmlContent(null)).toBe(false)
            expect(isHtmlContent(undefined)).toBe(false)
        })
    })

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

        it('should return empty/null/undefined as-is', () => {
            expect(escapeXmlTags('')).toBe('')
            expect(escapeXmlTags(null)).toBe(null)
            expect(escapeXmlTags(undefined)).toBe(undefined)
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
                content: [
                    {
                        type: 'paragraph',
                        content: [{ type: 'text', text: '&lt;div&gt;content&lt;/div&gt;' }]
                    }
                ]
            }
            unescapeXmlEntities(json)
            expect(json.content[0].content[0].text).toBe('<div>content</div>')
        })

        it('should handle nested content', () => {
            const json = {
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [{ type: 'text', text: '&lt;outer&gt;' }]
                    },
                    {
                        type: 'paragraph',
                        content: [{ type: 'text', text: '&lt;inner&gt;text&lt;/inner&gt;' }]
                    },
                    {
                        type: 'paragraph',
                        content: [{ type: 'text', text: '&lt;/outer&gt;' }]
                    }
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

        it('should unescape tags with attributes containing ampersands', () => {
            expect(unescapeXmlTags('&lt;datasource url="foo&amp;bar=1"&gt;text&lt;/datasource&gt;')).toBe(
                '<datasource url="foo&amp;bar=1">text</datasource>'
            )
        })

        it('should handle mixed content', () => {
            const input = '# Heading\n&lt;question&gt;text&lt;/question&gt;\nsome markdown'
            const expected = '# Heading\n<question>text</question>\nsome markdown'
            expect(unescapeXmlTags(input)).toBe(expected)
        })

        it('should return empty/null/undefined as-is', () => {
            expect(unescapeXmlTags('')).toBe('')
            expect(unescapeXmlTags(null)).toBe(null)
            expect(unescapeXmlTags(undefined)).toBe(undefined)
        })

        it('should pass through raw (unescaped) tags unchanged', () => {
            expect(unescapeXmlTags('<question>text</question>')).toBe('<question>text</question>')
        })
    })

    describe('roundtrip (escape → unescape)', () => {
        const cases = [
            '<question>What is the answer?</question>',
            '<context type="system">You are helpful</context>',
            '<instructions>\n- Step 1\n- Step 2\n</instructions>',
            '<outer><inner>nested</inner></outer>',
            '# Title\n<question>{{input}}</question>\n**bold** text',
            '<my-component />',
            'No tags here, just **markdown**',
            '<div>standard html preserved</div>',
            '<example>This has <strong>standard</strong> HTML inside</example>'
        ]

        cases.forEach((input) => {
            it(`should roundtrip: ${input.substring(0, 50)}...`, () => {
                const escaped = escapeXmlTags(input)
                const restored = unescapeXmlTags(escaped)
                expect(restored).toBe(input)
            })
        })
    })

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

        it('should preserve unordered list syntax', () => {
            const input = '- Step 1\n- Step 2\n- Step 3'
            expect(escapeXmlTags(input)).toBe(input)
            expect(unescapeXmlTags(input)).toBe(input)
        })

        it('should preserve ordered list syntax', () => {
            const input = '1. First\n2. Second\n3. Third'
            expect(escapeXmlTags(input)).toBe(input)
            expect(unescapeXmlTags(input)).toBe(input)
        })

        it('should preserve code blocks', () => {
            const input = '```python\nprint("hello")\n```'
            expect(escapeXmlTags(input)).toBe(input)
            expect(unescapeXmlTags(input)).toBe(input)
        })

        it('should preserve inline code', () => {
            const input = 'Use `console.log()` for debugging'
            expect(escapeXmlTags(input)).toBe(input)
            expect(unescapeXmlTags(input)).toBe(input)
        })

        it('should preserve markdown links [text](url)', () => {
            const input = 'See [the docs](https://example.com/path?q=1&r=2) for details'
            expect(escapeXmlTags(input)).toBe(input)
            expect(unescapeXmlTags(input)).toBe(input)
        })

        it('should roundtrip HTML <a> links', () => {
            const input = 'Visit <a href="https://flowiseai.com">Flowise</a> for docs'
            const escaped = escapeXmlTags(input)
            expect(escaped).toContain('&lt;a href="https://flowiseai.com"&gt;')
            expect(unescapeXmlTags(escaped)).toBe(input)
        })

        it('should preserve complex pasted markdown with XML tags', () => {
            const input =
                '## System Prompt\n\n' +
                '<instructions>\n' +
                '- Be helpful\n' +
                '- Be **concise**\n' +
                '</instructions>\n\n' +
                'See [docs](https://example.com) for more info.\n' +
                'Also visit <a href="https://flowiseai.com">Flowise</a>.\n\n' +
                '```\ncode block\n```'
            const escaped = escapeXmlTags(input)
            expect(escaped).not.toBe(input)
            const restored = unescapeXmlTags(escaped)
            expect(restored).toBe(input)
        })
    })

    /**
     * Simulates the full editor save/reload cycle as it happens in RichInput:
     *
     *   LOAD (saved value → editor):
     *     1. escapeXmlTags(savedValue)              — entities prevent marked from stripping tags
     *     2. setContent(escaped, 'markdown')         — marked parses entities as text nodes
     *     3. unescapeXmlEntities(editor.getJSON())   — fix "&lt;" → "<" in ProseMirror JSON
     *     4. setContent(decodedJson)                 — editor now displays <question> correctly
     *
     *   SAVE (editor → saved value):
     *     5. editor.getMarkdown()                    — serializes text nodes with raw "<"
     *     6. unescapeXmlTags(markdown)               — safety net for any remaining entities
     *     7. onChange(result)                         — written to flow JSON
     */
    describe('full editor save/reload cycle', () => {
        function simulateEditorCycle(userInput) {
            // --- LOAD ---
            // Step 1: escape XML tags to entities
            const escaped = escapeXmlTags(userInput)
            // Steps 2-3: marked creates text nodes with entities, then unescapeXmlEntities fixes them
            const mockJson = {
                type: 'doc',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: escaped }] }]
            }
            unescapeXmlEntities(mockJson)
            // Step 4: verify editor would display proper angle brackets (no entities)
            const editorDisplayText = mockJson.content[0].content[0].text
            expect(editorDisplayText).not.toMatch(/&lt;|&gt;/)

            // --- SAVE ---
            // Step 5: getMarkdown() outputs text node content as-is (no escaping)
            const markdownOutput = editorDisplayText
            // Step 6: unescape safety net
            return unescapeXmlTags(markdownOutput)
        }

        it('should preserve XML-tagged prompt', () => {
            const userInput = '<question>What is the answer?</question>'
            expect(simulateEditorCycle(userInput)).toBe(userInput)
        })

        it('should preserve tags with attributes', () => {
            const userInput = '<context type="system">You are helpful</context>'
            expect(simulateEditorCycle(userInput)).toBe(userInput)
        })

        it('should preserve multiline structured prompt', () => {
            const userInput = '<instructions>\n- Step 1\n- Step 2\n</instructions>'
            expect(simulateEditorCycle(userInput)).toBe(userInput)
        })

        it('should preserve nested XML tags', () => {
            const userInput = '<outer><inner>nested</inner></outer>'
            expect(simulateEditorCycle(userInput)).toBe(userInput)
        })

        it('should preserve XML tags mixed with markdown and variables', () => {
            const userInput = '# Title\n<question>{{input}}</question>\n**bold** text'
            expect(simulateEditorCycle(userInput)).toBe(userInput)
        })

        it('should preserve standard HTML tags too', () => {
            const userInput = '<div>content in a div</div>'
            expect(simulateEditorCycle(userInput)).toBe(userInput)
        })

        it('should handle mixed custom and standard tags', () => {
            const userInput = '<example>This has <strong>bold</strong> HTML inside</example>'
            expect(simulateEditorCycle(userInput)).toBe(userInput)
        })

        it('should leave plain markdown unchanged', () => {
            const userInput = 'No tags here, just **markdown**'
            expect(simulateEditorCycle(userInput)).toBe(userInput)
        })
    })
})
