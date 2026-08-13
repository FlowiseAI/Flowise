import axios from 'axios'
import * as fs from 'fs'

import { getModelConfigByModelName, MODEL_TYPE } from './modelLoader'

jest.mock('axios', () => ({
    get: jest.fn()
}))

jest.mock('fs', () => ({
    existsSync: jest.fn(),
    promises: {
        readFile: jest.fn()
    }
}))

const mockedAxios = axios as jest.Mocked<typeof axios>
const mockedFs = fs as unknown as {
    existsSync: jest.Mock
    promises: {
        readFile: jest.Mock
    }
}

const originalModelConfigJson = process.env.MODEL_LIST_CONFIG_JSON
const originalRequestTimeout = process.env.MODEL_LIST_REQUEST_TIMEOUT_MS

beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.MODEL_LIST_CONFIG_JSON
    delete process.env.MODEL_LIST_REQUEST_TIMEOUT_MS
    mockedFs.existsSync.mockReset()
    mockedFs.promises.readFile.mockReset()
})

afterEach(() => {
    if (originalModelConfigJson == null) {
        delete process.env.MODEL_LIST_CONFIG_JSON
    } else {
        process.env.MODEL_LIST_CONFIG_JSON = originalModelConfigJson
    }

    if (originalRequestTimeout == null) {
        delete process.env.MODEL_LIST_REQUEST_TIMEOUT_MS
    } else {
        process.env.MODEL_LIST_REQUEST_TIMEOUT_MS = originalRequestTimeout
    }
})

describe('modelLoader', () => {
    it('passes a bounded timeout to axios.get when loading remote model config', async () => {
        process.env.MODEL_LIST_CONFIG_JSON = 'https://example.com/models.json'
        process.env.MODEL_LIST_REQUEST_TIMEOUT_MS = '1000'

        mockedAxios.get.mockResolvedValue({
            status: 200,
            data: {
                chat: [{ name: 'awsChatBedrock', models: [] }],
                llm: [],
                embedding: []
            }
        })

        await getModelConfigByModelName(MODEL_TYPE.CHAT, 'awsChatBedrock', 'awsChatBedrock')

        expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com/models.json', {
            timeout: 1000
        })
    })

    it('falls back to the bundled models.json when the remote fetch fails', async () => {
        process.env.MODEL_LIST_CONFIG_JSON = 'https://example.com/models.json'

        mockedAxios.get.mockRejectedValue(new Error('timeout'))
        mockedFs.existsSync.mockReturnValue(true)
        mockedFs.promises.readFile.mockResolvedValue(
            JSON.stringify({
                chat: [
                    {
                        name: 'awsChatBedrock',
                        models: [
                            {
                                label: 'ai21.jamba-1-5-large-v1:0',
                                name: 'ai21.jamba-1-5-large-v1:0'
                            }
                        ]
                    }
                ],
                llm: [],
                embedding: []
            })
        )

        const modelConfig = await getModelConfigByModelName(MODEL_TYPE.CHAT, 'awsChatBedrock', 'ai21.jamba-1-5-large-v1:0')

        expect(modelConfig).toBeDefined()
        expect(modelConfig?.name).toBe('ai21.jamba-1-5-large-v1:0')
    })
})
