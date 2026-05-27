jest.mock('@langchain/classic/retrievers/contextual_compression', () => ({
    ContextualCompressionRetriever: jest.fn().mockImplementation(({ baseCompressor, baseRetriever }) => ({
        baseCompressor,
        baseRetriever,
        invoke: jest.fn().mockResolvedValue([{ pageContent: 'reranked doc', metadata: { relevance_score: 0.98 } }])
    }))
}))

jest.mock('../../../src', () => ({
    getCredentialData: jest.fn(),
    getCredentialParam: jest.fn(),
    handleEscapeCharacters: jest.fn((text: string) => text)
}))

jest.mock('./BaiduQianfanRerank', () => ({
    BaiduQianfanRerank: jest.fn().mockImplementation((qianfanAccessKey, qianfanSecretKey, model, topN) => ({
        qianfanAccessKey,
        qianfanSecretKey,
        model,
        topN
    }))
}))

import { ContextualCompressionRetriever } from '@langchain/classic/retrievers/contextual_compression'
import { getCredentialData, getCredentialParam, handleEscapeCharacters } from '../../../src'
import { BaiduQianfanRerank } from './BaiduQianfanRerank'

const { nodeClass: BaiduQianfanRerankRetriever } = require('./BaiduQianfanRerankRetriever')

describe('BaiduQianfanRerankRetriever', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('declares Flowise metadata, existing Baidu credential, and built-in model option', () => {
        const node = new BaiduQianfanRerankRetriever()
        const modelInput = node.inputs.find((input: { name: string }) => input.name === 'modelName')

        expect(node).toMatchObject({
            label: 'Baidu Qianfan Rerank Retriever',
            name: 'baiduQianfanRerankRetriever',
            type: 'BaiduQianfanRerankRetriever',
            category: 'Retrievers',
            icon: 'baiduwenxin.svg'
        })
        expect(node.credential).toMatchObject({
            name: 'credential',
            credentialNames: ['baiduQianfanApi']
        })
        expect(modelInput).toMatchObject({
            type: 'options',
            default: 'bce-reranker-base_v1',
            options: [{ label: 'bce-reranker-base_v1', name: 'bce-reranker-base_v1' }]
        })
    })

    it('creates a contextual compression retriever with Qianfan credentials and base retriever k by default', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({
            qianfanAccessKey: 'access-key',
            qianfanSecretKey: 'secret-key'
        })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, credentialData) => credentialData[key])
        const baseRetriever = { k: 6 }

        const node = new BaiduQianfanRerankRetriever()
        const result = await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    baseRetriever,
                    modelName: 'bce-reranker-base_v1'
                },
                outputs: {
                    output: 'retriever'
                }
            },
            'user query',
            {}
        )

        expect(BaiduQianfanRerank).toHaveBeenCalledWith('access-key', 'secret-key', 'bce-reranker-base_v1', 6)
        expect(ContextualCompressionRetriever).toHaveBeenCalledWith({
            baseCompressor: expect.objectContaining({ model: 'bce-reranker-base_v1', topN: 6 }),
            baseRetriever
        })
        expect(result).toMatchObject({ baseRetriever })
    })

    it('uses custom model names and explicit topN values', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({
            qianfanAccessKey: 'access-key',
            qianfanSecretKey: 'secret-key'
        })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, credentialData) => credentialData[key])

        const node = new BaiduQianfanRerankRetriever()
        await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    baseRetriever: { k: 10 },
                    modelName: 'bce-reranker-base_v1',
                    customModelName: 'custom-reranker',
                    topN: '3'
                },
                outputs: {
                    output: 'retriever'
                }
            },
            'user query',
            {}
        )

        expect(BaiduQianfanRerank).toHaveBeenCalledWith('access-key', 'secret-key', 'custom-reranker', 3)
    })

    it('returns document output by invoking the rerank retriever', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({
            qianfanAccessKey: 'access-key',
            qianfanSecretKey: 'secret-key'
        })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, credentialData) => credentialData[key])

        const node = new BaiduQianfanRerankRetriever()
        const result = await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    baseRetriever: { k: 4 },
                    modelName: 'bce-reranker-base_v1',
                    query: 'override query'
                },
                outputs: {
                    output: 'document'
                }
            },
            'input query',
            {}
        )

        const retriever = (ContextualCompressionRetriever as unknown as jest.Mock).mock.results[0].value
        expect(retriever.invoke).toHaveBeenCalledWith('override query')
        expect(result).toEqual([{ pageContent: 'reranked doc', metadata: { relevance_score: 0.98 } }])
    })

    it('returns text output by concatenating reranked documents', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({
            qianfanAccessKey: 'access-key',
            qianfanSecretKey: 'secret-key'
        })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, credentialData) => credentialData[key])

        const node = new BaiduQianfanRerankRetriever()
        const result = await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    baseRetriever: { k: 4 },
                    modelName: 'bce-reranker-base_v1'
                },
                outputs: {
                    output: 'text'
                }
            },
            'input query',
            {}
        )

        expect(handleEscapeCharacters).toHaveBeenCalledWith('reranked doc\n', false)
        expect(result).toBe('reranked doc\n')
    })
})
