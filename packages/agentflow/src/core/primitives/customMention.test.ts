// Import triggers Mention.extend() at module level — must come before we read mock.calls.
import './customMention'

import { PasteRule } from '@tiptap/core'
import Mention from '@tiptap/extension-mention'

// Grab the config object passed to Mention.extend() so we can test each property.
const extendConfig = (Mention.extend as jest.Mock).mock.calls[0][0] as Record<string, unknown>

describe('CustomMention extension config', () => {
    describe('renderText', () => {
        const renderText = extendConfig.renderText as (args: { node: { attrs: Record<string, string> } }) => string

        it('renders label in double-brace syntax', () => {
            expect(renderText({ node: { attrs: { label: 'question', id: 'q1' } } })).toBe('{{question}}')
        })

        it('falls back to id when label is missing', () => {
            expect(renderText({ node: { attrs: { id: 'chat_history' } } })).toBe('{{chat_history}}')
        })
    })

    describe('markdownTokenizer', () => {
        const tokenizer = extendConfig.markdownTokenizer as {
            name: string
            level: string
            start: string
            tokenize: (src: string) => { type: string; raw: string; label: string } | undefined
        }

        it('has correct name and level', () => {
            expect(tokenizer.name).toBe('mention')
            expect(tokenizer.level).toBe('inline')
            expect(tokenizer.start).toBe('{{')
        })

        it('tokenizes {{variable}} syntax', () => {
            const result = tokenizer.tokenize('{{question}} rest')
            expect(result).toEqual({ type: 'mention', raw: '{{question}}', label: 'question' })
        })

        it('trims whitespace in label', () => {
            const result = tokenizer.tokenize('{{  chat_history  }}')
            expect(result).toEqual({ type: 'mention', raw: '{{  chat_history  }}', label: 'chat_history' })
        })

        it('returns undefined for non-matching input', () => {
            expect(tokenizer.tokenize('plain text')).toBeUndefined()
        })

        it('returns undefined for single braces', () => {
            expect(tokenizer.tokenize('{question}')).toBeUndefined()
        })

        it('does not match nested braces', () => {
            expect(tokenizer.tokenize('{{outer{{inner}}}}')).toBeUndefined()
        })
    })

    describe('parseMarkdown', () => {
        const parseMarkdown = extendConfig.parseMarkdown as (token: { label: string }) => {
            type: string
            attrs: { id: string; label: string }
        }

        it('converts token to mention node attrs', () => {
            expect(parseMarkdown({ label: 'question' })).toEqual({
                type: 'mention',
                attrs: { id: 'question', label: 'question' }
            })
        })
    })

    describe('renderMarkdown', () => {
        const renderMarkdown = extendConfig.renderMarkdown as (node: { attrs?: Record<string, string> }) => string

        it('renders label in double-brace syntax', () => {
            expect(renderMarkdown({ attrs: { label: 'question', id: 'q1' } })).toBe('{{question}}')
        })

        it('falls back to id when label is missing', () => {
            expect(renderMarkdown({ attrs: { id: 'chat_history' } })).toBe('{{chat_history}}')
        })

        it('handles undefined attrs gracefully', () => {
            expect(renderMarkdown({})).toBe('{{undefined}}')
        })
    })

    describe('addPasteRules', () => {
        // addPasteRules is a function bound to `this` in the extension context
        const addPasteRules = extendConfig.addPasteRules as () => PasteRule[]

        it('returns an array with one PasteRule', () => {
            const rules = addPasteRules.call({ name: 'mention' })
            expect(rules).toHaveLength(1)
            expect(rules[0]).toBeInstanceOf(PasteRule)
        })

        it('paste rule has a global regex for {{...}} pattern', () => {
            const rules = addPasteRules.call({ name: 'mention' })
            expect(rules[0].find).toEqual(/\{\{([^{}]+)\}\}/g)
        })
    })

    describe('markdownTokenName', () => {
        it('is "mention"', () => {
            expect(extendConfig.markdownTokenName).toBe('mention')
        })
    })
})
