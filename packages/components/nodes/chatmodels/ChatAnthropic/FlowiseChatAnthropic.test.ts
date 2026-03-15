jest.mock('@langchain/anthropic', () => ({
    ChatAnthropic: class MockChatAnthropic {
        modelName: string
        maxTokens: number
        constructor(fields: any) {
            this.modelName = fields?.modelName || ''
            this.maxTokens = fields?.maxTokens ?? 2048
        }
    }
}))

import { ChatAnthropic } from './FlowiseChatAnthropic'

describe('ChatAnthropic - setVisionModel', () => {
    it('keeps claude-3-opus model unchanged', () => {
        const model = new ChatAnthropic('test', { modelName: 'claude-3-opus-20240229' } as any)
        model.setVisionModel()
        expect(model.modelName).toBe('claude-3-opus-20240229')
    })

    it('keeps claude-3-5-sonnet model unchanged', () => {
        const model = new ChatAnthropic('test', { modelName: 'claude-3-5-sonnet-20241022' } as any)
        model.setVisionModel()
        expect(model.modelName).toBe('claude-3-5-sonnet-20241022')
    })

    it('keeps claude-3-7-sonnet model unchanged', () => {
        const model = new ChatAnthropic('test', { modelName: 'claude-3-7-sonnet-20250219' } as any)
        model.setVisionModel()
        expect(model.modelName).toBe('claude-3-7-sonnet-20250219')
    })

    it('keeps claude-opus-4-5 model unchanged', () => {
        const model = new ChatAnthropic('test', { modelName: 'claude-opus-4-5' } as any)
        model.setVisionModel()
        expect(model.modelName).toBe('claude-opus-4-5')
    })

    it('keeps claude-sonnet-4-5 model unchanged', () => {
        const model = new ChatAnthropic('test', { modelName: 'claude-sonnet-4-5' } as any)
        model.setVisionModel()
        expect(model.modelName).toBe('claude-sonnet-4-5')
    })

    it('keeps claude-haiku-4-5 model unchanged', () => {
        const model = new ChatAnthropic('test', { modelName: 'claude-haiku-4-5' } as any)
        model.setVisionModel()
        expect(model.modelName).toBe('claude-haiku-4-5')
    })

    it('keeps claude-opus-4-0 model unchanged', () => {
        const model = new ChatAnthropic('test', { modelName: 'claude-opus-4-0' } as any)
        model.setVisionModel()
        expect(model.modelName).toBe('claude-opus-4-0')
    })

    it('keeps claude-sonnet-4-0 model unchanged', () => {
        const model = new ChatAnthropic('test', { modelName: 'claude-sonnet-4-0' } as any)
        model.setVisionModel()
        expect(model.modelName).toBe('claude-sonnet-4-0')
    })

    it('keeps claude-opus-4-1 model unchanged', () => {
        const model = new ChatAnthropic('test', { modelName: 'claude-opus-4-1' } as any)
        model.setVisionModel()
        expect(model.modelName).toBe('claude-opus-4-1')
    })

    it('falls back to default for non-vision models', () => {
        const model = new ChatAnthropic('test', { modelName: 'claude-2.1' } as any)
        model.setVisionModel()
        expect(model.modelName).toBe('claude-3-5-haiku-latest')
    })

    it('falls back to default for claude-instant', () => {
        const model = new ChatAnthropic('test', { modelName: 'claude-instant-1.2' } as any)
        model.setVisionModel()
        expect(model.modelName).toBe('claude-3-5-haiku-latest')
    })
})
