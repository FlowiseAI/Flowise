import * as fs from 'fs'
import * as path from 'path'
import { getMiniMaxTTSEndpoint } from './textToSpeech'

describe('MiniMax parameter refresh', () => {
    const modelsPath = path.join(__dirname, '..', 'models.json')
    const models = JSON.parse(fs.readFileSync(modelsPath, 'utf8'))
    const catalog = models.chat.find((entry: any) => entry.name === 'chatMiniMax')

    it('records the current model parameters', () => {
        expect(catalog.models).toEqual([
            expect.objectContaining({
                name: 'MiniMax-M3',
                context_window: 1000000,
                pricing_usd_per_million_tokens: { input: 0.6, output: 2.4, cache_read: 0.12, cache_write: null },
                input_modalities: ['text', 'image', 'video'],
                thinking: ['adaptive', 'disabled']
            }),
            expect.objectContaining({
                name: 'MiniMax-M2.7',
                context_window: 204800,
                pricing_usd_per_million_tokens: { input: 0.3, output: 1.2, cache_read: 0.06, cache_write: 0.375 },
                input_modalities: ['text'],
                thinking: ['always_on']
            })
        ])
    })

    it('resolves both TTS regions', () => {
        expect(getMiniMaxTTSEndpoint()).toBe('https://api.minimax.io/v1/t2a_v2')
        expect(getMiniMaxTTSEndpoint('cn_zh')).toBe('https://api.minimaxi.com/v1/t2a_v2')
    })
})
