import { AIMessage } from '@langchain/core/messages'
import { convertMessageContentToParts } from './FlowiseChatGoogleGenerativeAI'

describe('convertMessageContentToParts — Gemini "thinking" content blocks', () => {
    // Background: When a Gemini model with thinking enabled
    // (gemini-2.5-* with thinkingConfig, gemini-3-flash-preview, etc.)
    // emits a thought summary, Flowise's response parser stores it as a
    // LangChain content block of shape:
    //
    //   { type: 'thinking', thinking: 'reasoning text…', signature: '…' }
    //
    // On the NEXT iteration of an agent loop, the assistant message is
    // echoed back to the API as conversation history, and each content
    // block runs through `_convertLangChainContentToPart`. Without a
    // branch for type='thinking', the converter throws
    // "Unknown content type thinking" and the agent node errors out.
    //
    // Google's native shape is a text Part with a boolean `thought: true`
    // flag and an optional `thoughtSignature` for Gemini-3 tool-call
    // signature continuity. See:
    //   https://ai.google.dev/gemini-api/docs/thinking
    //   https://ai.google.dev/gemini-api/docs/thought-signatures

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

    it('coerces non-string thinking payload to a string instead of throwing', () => {
        const msg = new AIMessage({
            content: [{ type: 'thinking', thinking: null } as any]
        })
        const parts = convertMessageContentToParts(msg, false, [])
        const p = parts[0] as any
        expect(p.thought).toBe(true)
        expect(typeof p.text).toBe('string')
    })

    it('still throws "Unknown content type" for truly unrecognized types', () => {
        const msg = new AIMessage({
            content: [{ type: 'definitely-not-a-real-type', value: 1 } as any]
        })
        expect(() => convertMessageContentToParts(msg, false, [])).toThrow(/Unknown content type/)
    })
})
