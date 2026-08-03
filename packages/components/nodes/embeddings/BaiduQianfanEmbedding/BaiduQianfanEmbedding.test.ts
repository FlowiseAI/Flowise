jest.mock('@langchain/baidu-qianfan', () => ({
    BaiduQianfanEmbeddings: jest.fn().mockImplementation((fields) => ({ fields }))
}))

jest.mock('../../../src/utils', () => ({
    getBaseClasses: jest.fn().mockReturnValue(['Embeddings']),
    getCredentialData: jest.fn(),
    getCredentialParam: jest.fn()
}))

jest.mock('../../../src/modelLoader', () => ({
    MODEL_TYPE: { EMBEDDING: 'embedding' },
    getModels: jest.fn()
}))

import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { getModels } from '../../../src/modelLoader'

const { nodeClass: BaiduQianfanEmbedding } = require('./BaiduQianfanEmbedding')

describe('BaiduQianfanEmbedding', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('loads embedding model options from the shared model loader', async () => {
        ;(getModels as jest.Mock).mockResolvedValue([{ label: 'Embedding-V1', name: 'Embedding-V1' }])

        const node = new BaiduQianfanEmbedding()
        const models = await node.loadMethods.listModels()

        expect(getModels).toHaveBeenCalledWith('embedding', 'baiduQianfanEmbeddings')
        expect(models).toEqual([{ label: 'Embedding-V1', name: 'Embedding-V1' }])
    })

    it('maps credential, custom model names, and optional embedding parameters into BaiduQianfanEmbeddings', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({
            qianfanAccessKey: 'access-key',
            qianfanSecretKey: 'secret-key'
        })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, credentialData) => credentialData[key])

        const node = new BaiduQianfanEmbedding()
        const model = await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    modelName: 'bge-large-zh',
                    customModelName: 'Qwen3-Embedding-4B',
                    stripNewLines: true,
                    batchSize: '8',
                    timeout: '15000'
                }
            },
            '',
            {}
        )

        expect(model.fields).toMatchObject({
            modelName: 'Qwen3-Embedding-4B',
            qianfanAccessKey: 'access-key',
            qianfanSecretKey: 'secret-key',
            stripNewLines: true,
            batchSize: 8,
            timeout: 15000
        })
    })

    it('preserves explicit zero values for numeric parameters', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({
            qianfanAccessKey: 'access-key',
            qianfanSecretKey: 'secret-key'
        })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, credentialData) => credentialData[key])

        const node = new BaiduQianfanEmbedding()
        const model = await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    modelName: 'Embedding-V1',
                    batchSize: '0',
                    timeout: '0'
                }
            },
            '',
            {}
        )

        expect(model.fields).toMatchObject({
            modelName: 'Embedding-V1',
            batchSize: 0,
            timeout: 0
        })
    })
})
