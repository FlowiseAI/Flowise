jest.mock('@langchain/openai', () => ({
    OpenAIClient: jest.fn(),
    toFile: jest.fn()
}))
jest.mock('./storageUtils', () => ({
    getFileFromStorage: jest.fn()
}))
jest.mock('./utils', () => ({
    getCredentialData: jest.fn()
}))
jest.mock('assemblyai', () => ({
    AssemblyAI: jest.fn()
}))
jest.mock('axios', () => ({
    __esModule: true,
    default: { post: jest.fn() }
}))
jest.mock('groq-sdk', () => ({
    __esModule: true,
    default: jest.fn()
}))

import { OpenAIClient, toFile } from '@langchain/openai'

import { IFileUpload } from './Interface'
import { convertSpeechToText } from './speechToText'
import { getFileFromStorage } from './storageUtils'
import { getCredentialData } from './utils'

describe('convertSpeechToText FunASR provider', () => {
    const audio = Buffer.from('test audio')
    const upload = { name: 'meeting.wav', type: 'audio/wav' } as IFileUpload
    const options = { orgId: 'org', chatflowid: 'flow', chatId: 'chat' }
    const convertedFile = { name: 'meeting.wav' }
    const createTranscription = jest.fn()
    const clientOptions: unknown[] = []

    beforeEach(() => {
        jest.clearAllMocks()
        clientOptions.length = 0
        ;(getFileFromStorage as jest.Mock).mockResolvedValue(audio)
        ;(toFile as jest.Mock).mockResolvedValue(convertedFile)
        ;(OpenAIClient as unknown as jest.Mock).mockImplementation((config) => {
            clientOptions.push(config)
            return {
                audio: {
                    transcriptions: {
                        create: createTranscription
                    }
                }
            }
        })
        createTranscription.mockResolvedValue({ text: 'Flowise can now hear FunASR.' })
    })

    it('uses local defaults without requiring a credential', async () => {
        const result = await convertSpeechToText(upload, { name: 'funASRSTT' }, options)

        expect(getCredentialData).not.toHaveBeenCalled()
        expect(clientOptions).toEqual([
            {
                apiKey: 'not-required',
                baseURL: 'http://127.0.0.1:8000/v1'
            }
        ])
        expect(toFile).toHaveBeenCalledWith(audio, 'meeting.wav')
        expect(createTranscription).toHaveBeenCalledWith({
            file: convertedFile,
            model: 'sensevoice',
            language: undefined
        })
        expect(result).toBe('Flowise can now hear FunASR.')
    })

    it('forwards optional gateway credentials and configured model fields', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({ funASRApiKey: 'gateway-token' })

        const result = await convertSpeechToText(
            upload,
            {
                name: 'funASRSTT',
                credentialId: 'funasr-credential',
                baseUrl: 'https://speech.example.com/v1',
                model: 'paraformer',
                language: 'zh'
            },
            options
        )

        expect(getCredentialData).toHaveBeenCalledWith('funasr-credential', options)
        expect(clientOptions).toEqual([
            {
                apiKey: 'gateway-token',
                baseURL: 'https://speech.example.com/v1'
            }
        ])
        expect(createTranscription).toHaveBeenCalledWith({
            file: convertedFile,
            model: 'paraformer',
            language: 'zh'
        })
        expect(result).toBe('Flowise can now hear FunASR.')
    })
})
