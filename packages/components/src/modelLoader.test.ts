import axios from 'axios'
import { getModelConfigByModelName, MODEL_TYPE } from './modelLoader'

jest.mock('axios')

const mockedAxios = axios as jest.Mocked<typeof axios>

describe('modelLoader', () => {
    const originalModelListConfigJson = process.env.MODEL_LIST_CONFIG_JSON

    afterEach(() => {
        jest.resetAllMocks()
        if (originalModelListConfigJson === undefined) {
            delete process.env.MODEL_LIST_CONFIG_JSON
        } else {
            process.env.MODEL_LIST_CONFIG_JSON = originalModelListConfigJson
        }
    })

    it('uses a bounded timeout when loading remote model config before falling back locally', async () => {
        process.env.MODEL_LIST_CONFIG_JSON = 'https://example.com/models.json'
        mockedAxios.get.mockRejectedValueOnce(new Error('timeout'))

        const modelConfig = await getModelConfigByModelName(MODEL_TYPE.CHAT, 'awsChatBedrock', 'ai21.jamba-1-5-large-v1:0')

        expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com/models.json', { timeout: 5000 })
        expect(modelConfig?.name).toBe('ai21.jamba-1-5-large-v1:0')
    })
})
