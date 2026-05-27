jest.mock('@langchain/classic/retrievers/contextual_compression', () => ({
    ContextualCompressionRetriever: jest.fn().mockImplementation(({ baseCompressor, baseRetriever }) => ({
        baseCompressor,
        baseRetriever,
        invoke: jest.fn().mockResolvedValue([{ pageContent: 'reranked doc', metadata: { relevance_score: 0.98 } }])
    }))
}))

jest.mock('../../../src/utils', () => ({
    getCredentialData: jest.fn(),
    getCredentialParam: jest.fn(),
    handleEscapeCharacters: jest.fn((text: string) => text)
}))

jest.mock('./BaiduQianfanRerank', () => ({
    BaiduQianfanRerank: jest.fn().mockImplementation((qianfanApiKey, model, topN) => ({
        qianfanApiKey,
        model,
        topN
    }))
}))

import { ContextualCompressionRetriever } from '@langchain/classic/retrievers/contextual_compression'
import { getCredentialData, getCredentialParam, handleEscapeCharacters } from '../../../src/utils'
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
            credentialNames: ['baiduQianfanApiKey', 'baiduQianfanApi']
        })
        expect(modelInput).toMatchObject({
            type: 'options',
            default: 'bce-reranker-base',
            options: [{ label: 'bce-reranker-base', name: 'bce-reranker-base' }]
        })
    })

    it('creates a contextual compression retriever with Qianfan API key and base retriever k by default', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({
            qianfanApiKey: 'api-key',
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
                    modelName: 'bce-reranker-base'
                },
                outputs: {
                    output: 'retriever'
                }
            },
            'user query',
            {}
        )

        expect(BaiduQianfanRerank).toHaveBeenCalledWith('api-key', 'bce-reranker-base', 6)
        expect(ContextualCompressionRetriever).toHaveBeenCalledWith({
            baseCompressor: expect.objectContaining({ model: 'bce-reranker-base', topN: 6 }),
            baseRetriever
        })
        expect(result).toMatchObject({ baseRetriever })
    })

    it('falls back to Qianfan access key when the dedicated API key field is not configured', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({
            qianfanAccessKey: 'fallback-api-key'
        })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, credentialData) => credentialData[key])

        const node = new BaiduQianfanRerankRetriever()
        await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    baseRetriever: { k: 4 },
                    modelName: 'bce-reranker-base'
                },
                outputs: {
                    output: 'retriever'
                }
            },
            'user query',
            {}
        )

        expect(BaiduQianfanRerank).toHaveBeenCalledWith('fallback-api-key', 'bce-reranker-base', 4)
    })

    it('uses custom model names and explicit topN values', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({
            qianfanApiKey: 'api-key'
        })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, credentialData) => credentialData[key])

        const node = new BaiduQianfanRerankRetriever()
        await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    baseRetriever: { k: 10 },
                    modelName: 'bce-reranker-base',
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

        expect(BaiduQianfanRerank).toHaveBeenCalledWith('api-key', 'custom-reranker', 3)
    })

    it('returns document output by invoking the rerank retriever', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({
            qianfanApiKey: 'api-key'
        })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, credentialData) => credentialData[key])

        const node = new BaiduQianfanRerankRetriever()
        const result = await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    baseRetriever: { k: 4 },
                    modelName: 'bce-reranker-base',
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
            qianfanApiKey: 'api-key'
        })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, credentialData) => credentialData[key])

        const node = new BaiduQianfanRerankRetriever()
        const result = await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    baseRetriever: { k: 4 },
                    modelName: 'bce-reranker-base'
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
