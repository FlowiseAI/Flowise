const mockPost = jest.fn()
const mockGet = jest.fn()
jest.mock('axios', () => ({ post: (...args: any[]) => mockPost(...args), get: (...args: any[]) => mockGet(...args) }))

jest.mock('../../../src/utils', () => ({
    getCredentialData: jest.fn(),
    getCredentialParam: jest.fn(),
    handleEscapeCharacters: jest.fn((input) => input)
}))

import { getCredentialData, getCredentialParam } from '../../../src/utils'

const { nodeClass: TwelveLabsVideo } = require('./TwelveLabs')

describe('TwelveLabs Video Document Loader', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        ;(getCredentialData as jest.Mock).mockResolvedValue({ twelveLabsApiKey: 'tl-key' })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, data) => data[key])
    })

    it('submits an analyze task and returns the generated text as a document', async () => {
        mockPost.mockResolvedValue({ data: { task_id: 'task-123', status: 'pending' } })
        mockGet.mockResolvedValue({ data: { task_id: 'task-123', status: 'ready', result: { data: 'A cat plays piano.' } } })

        const node = new TwelveLabsVideo()
        const docs = await node.init(
            {
                credential: 'cred-1',
                inputs: { videoUrl: 'https://example.com/v.mp4', prompt: 'Describe', modelName: 'pegasus1.5' },
                outputs: { output: 'document' }
            },
            '',
            {}
        )

        expect(docs).toHaveLength(1)
        expect(docs[0].pageContent).toBe('A cat plays piano.')
        expect(docs[0].metadata.source).toBe('https://example.com/v.mp4')
        expect(mockPost).toHaveBeenCalledWith(
            'https://api.twelvelabs.io/v1.3/analyze/tasks',
            expect.objectContaining({
                model_name: 'pegasus1.5',
                video: { type: 'url', url: 'https://example.com/v.mp4' },
                prompt: 'Describe'
            }),
            expect.objectContaining({ headers: { 'x-api-key': 'tl-key' } })
        )
    })

    it('throws when the task fails', async () => {
        mockPost.mockResolvedValue({ data: { task_id: 'task-123', status: 'pending' } })
        mockGet.mockResolvedValue({ data: { task_id: 'task-123', status: 'failed' } })

        const node = new TwelveLabsVideo()
        await expect(
            node.init(
                {
                    credential: 'cred-1',
                    inputs: { videoUrl: 'https://example.com/v.mp4', prompt: 'Describe' },
                    outputs: { output: 'document' }
                },
                '',
                {}
            )
        ).rejects.toThrow('analysis task failed')
    })

    it('requires a video url', async () => {
        const node = new TwelveLabsVideo()
        await expect(node.init({ credential: 'cred-1', inputs: {}, outputs: {} }, '', {})).rejects.toThrow('Video URL is required')
    })
})
