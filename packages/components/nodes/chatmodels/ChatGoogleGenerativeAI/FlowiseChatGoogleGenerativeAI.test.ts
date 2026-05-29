import { AIMessage } from '@langchain/core/messages'
import { convertMessageContentToParts } from './FlowiseChatGoogleGenerativeAI'

describe('convertMessageContentToParts — Gemini "thinking" content blocks', () => {
    it('round-trips a thinking content block back into a Gemini text Part with thought=true', () => {
        const msg = new AIMessage({
            content: [
                { type: 'thinking', thinking: 'First I should validate the inputs.' } as any,
                { type: 'text', text: 'OK, validated.' }
            ]
        })

        const parts = convertMessageContentToParts(msg, false, [])

        const thoughtPart = parts.find((p: any) => p.thought === true) as any
        expect(thoughtPart).toBeDefined()
        expect(thoughtPart.text).toBe('First I should validate the inputs.')
        expect(thoughtPart.thought).toBe(true)
        // No signature in the input → no thoughtSignature in the output
        expect(thoughtPart.thoughtSignature).toBeUndefined()

        const textPart = parts.find((p: any) => p.text === 'OK, validated.' && !p.thought) as any
        expect(textPart).toBeDefined()
    })

    it('preserves the thoughtSignature for Gemini-3 multi-turn tool-call continuity', () => {
        // signature is stored under `signature` on the LangChain block (see
        // the response parsers' output in FlowiseChatGoogleGenerativeAI.ts);
        // it must be emitted as `thoughtSignature` on the outgoing Part.
        const msg = new AIMessage({
            content: [
                {
                    type: 'thinking',
                    thinking: 'Need to call the search tool.',
                    signature: 'abc123-thought-sig'
                } as any
            ]
        })

        const parts = convertMessageContentToParts(msg, false, [])
        const p = parts[0] as any
        expect(p.thought).toBe(true)
        expect(p.thoughtSignature).toBe('abc123-thought-sig')
    })

    it('also accepts thoughtSignature on the LangChain block (alternate key name)', () => {
        const msg = new AIMessage({
            content: [
                {
                    type: 'thinking',
                    thinking: 'alt',
                    thoughtSignature: 'sig-from-alt-key'
                } as any
            ]
        })

        const parts = convertMessageContentToParts(msg, false, [])
        const p = parts[0] as any
        expect(p.thought).toBe(true)
        expect(p.thoughtSignature).toBe('sig-from-alt-key')
    })

    it('treats undefined/null thinking as empty text rather than throwing', () => {
        // Producer sites in this file always emit a string `thinking`,
        // but defensive: missing fields should not crash the converter
        // — they should just degrade to an empty thought part. (`??`
        // collapses both undefined and null into the fallback.)
        const msg = new AIMessage({
            content: [{ type: 'thinking' } as any] // no `thinking` field at all
        })
        const parts = convertMessageContentToParts(msg, false, [])
        const p = parts[0] as any
        expect(p.thought).toBe(true)
        expect(p.text).toBe('')
    })

    it('fails fast on non-string thinking payload (per code-review feedback)', () => {
        const msg = new AIMessage({
            content: [{ type: 'thinking', thinking: 42 } as any]
        })
        expect(() => convertMessageContentToParts(msg, false, [])).toThrow(/Invalid 'thinking' content: expected string, got number/)
    })

    it('fails fast on non-string thinking signature', () => {
        const msg = new AIMessage({
            content: [{ type: 'thinking', thinking: 'ok', signature: 42 } as any]
        })
        expect(() => convertMessageContentToParts(msg, false, [])).toThrow(/Invalid 'thinking' signature: expected string, got number/)
    })

    it('still throws "Unknown content type" for truly unrecognized types', () => {
        const msg = new AIMessage({
            content: [{ type: 'definitely-not-a-real-type', value: 1 } as any]
        })
        expect(() => convertMessageContentToParts(msg, false, [])).toThrow(/Unknown content type/)
    })
})
