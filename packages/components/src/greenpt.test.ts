import axios from 'axios'
import { filterGreenPTModels, GREENPT_API_BASE_URL, transcribeWithGreenPT } from './greenpt'

jest.mock('axios')

const mockedAxios = axios as jest.Mocked<typeof axios>

describe('GreenPT helpers', () => {
    const models = {
        data: [
            { id: 'glm-5.2' },
            { id: 'kimi-k2.7-code' },
            { id: 'green-embedding' },
            { id: 'green-rerank' },
            { id: 'green-s' },
            { id: 'green-s-pro' },
            { id: 42 }
        ]
    }

    it.each([
        ['chat', ['glm-5.2', 'kimi-k2.7-code']],
        ['embedding', ['green-embedding']],
        ['rerank', ['green-rerank']],
        ['speech', ['green-s', 'green-s-pro']]
    ] as const)('filters live models for %s', (type, expected) => {
        expect(filterGreenPTModels(models, type).map((model) => model.name)).toEqual(expected)
    })

    it('transcribes audio with the GreenPT listen protocol', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: { results: { channels: [{ alternatives: [{ transcript: ' renewable inference ' }] }] } }
        })

        await expect(
            transcribeWithGreenPT(Buffer.from('audio'), 'audio/wav', { model: 'green-s-pro', language: 'en', punctuate: 'true' }, 'secret')
        ).resolves.toBe('renewable inference')
        expect(mockedAxios.post).toHaveBeenCalledWith(
            `${GREENPT_API_BASE_URL}/listen`,
            expect.any(Buffer),
            expect.objectContaining({
                headers: { Authorization: 'Token secret', 'Content-Type': 'audio/wav' },
                params: { model: 'green-s-pro', language: 'en', punctuate: true },
                timeout: 300_000
            })
        )
    })

    it('rejects malformed speech responses', async () => {
        mockedAxios.post.mockResolvedValueOnce({ data: { results: { channels: [] } } })
        await expect(transcribeWithGreenPT(Buffer.from('audio'), 'invalid\r\nheader', {}, 'secret')).rejects.toThrow(
            'contains no valid transcript'
        )
        expect(mockedAxios.post).toHaveBeenLastCalledWith(
            `${GREENPT_API_BASE_URL}/listen`,
            expect.any(Buffer),
            expect.objectContaining({ headers: expect.objectContaining({ 'Content-Type': 'application/octet-stream' }) })
        )
    })
})
