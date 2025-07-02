import { BaseLanguageModel } from '@langchain/core/language_models/base'
import { MultiRetrievalQAChain } from 'langchain/chains'
import { ICommonObject, INode, INodeData, INodeParams, IServerSideEventStreamer, VectorStoreRetriever } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'
import { checkInputs, Moderation, streamResponse } from '../../moderation/Moderation'
import { formatResponse } from '../../outputparsers/OutputParserHelpers'

class MultiRetrievalQAChain_Chains implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    baseClasses: string[]
    description: string
    badge: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Multi Retrieval QA Chain'
        this.name = 'multiRetrievalQAChain'
        this.version = 2.0
        this.badge = 'DEPRECATING'
        this.type = 'MultiRetrievalQAChain'
        this.icon = 'qa.svg'
        this.category = 'Chains'
        this.description = 'QA Chain that automatically picks an appropriate vector store from multiple retrievers'
        this.baseClasses = [this.type, ...getBaseClasses(MultiRetrievalQAChain)]
        this.inputs = [
            {
                label: 'Language Model',
                name: 'model',
                type: 'BaseLanguageModel'
            },
            {
                label: 'Vector Store Retriever',
                name: 'vectorStoreRetriever',
                type: 'VectorStoreRetriever',
                list: true
            },
            {
                label: 'Return Source Documents',
                name: 'returnSourceDocuments',
                type: 'boolean',
                optional: true
            },
            {
                label: 'Input Moderation',
                description: 'Detect text that could generate harmful output and prevent it from being sent to the language model',
                name: 'inputModeration',
                type: 'Moderation',
                optional: true,
                list: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as BaseLanguageModel
        const vectorStoreRetriever = nodeData.inputs?.vectorStoreRetriever as VectorStoreRetriever[]
        const returnSourceDocuments = nodeData.inputs?.returnSourceDocuments as boolean

        const retrieverNames = []
        const retrieverDescriptions = []
        const retrievers = []

        for (const vs of vectorStoreRetriever) {
            retrieverNames.push(vs.name)
            retrieverDescriptions.push(vs.description)
            retrievers.push(vs.vectorStore.asRetriever((vs.vectorStore as any).k ?? 4))
        }

        const chain = MultiRetrievalQAChain.fromLLMAndRetrievers(model, {
            retrieverNames,
            retrieverDescriptions,
            retrievers,
            retrievalQAChainOpts: { verbose: process.env.DEBUG === 'true' ? true : false, returnSourceDocuments }
        })
        return chain
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | ICommonObject> {
        const chain = nodeData.instance as MultiRetrievalQAChain
        const returnSourceDocuments = nodeData.inputs?.returnSourceDocuments as boolean
        const moderations = nodeData.inputs?.inputModeration as Moderation[]

        const shouldStreamResponse = options.shouldStreamResponse
        const sseStreamer: IServerSideEventStreamer = options.sseStreamer as IServerSideEventStreamer
        const chatId = options.chatId

        if (moderations && moderations.length > 0) {
            try {
                // Use the output of the moderation chain as input for the Multi Retrieval QA Chain
                input = await checkInputs(moderations, input)
            } catch (e) {
                await new Promise((resolve) => setTimeout(resolve, 500))
                if (options.shouldStreamResponse) {
                    streamResponse(options.sseStreamer, options.chatId, e.message)
                }
                return formatResponse(e.message)
            }
        }
        const obj = { input }
        const loggerHandler = new ConsoleCallbackHandler(options.logger, options?.orgId)
        const callbacks = await additionalCallbacks(nodeData, options)

        if (shouldStreamResponse) {
            const handler = new CustomChainHandler(sseStreamer, chatId, 2, returnSourceDocuments)
            const res = await chain.call(obj, [loggerHandler, handler, ...callbacks])
            if (res.text && res.sourceDocuments) return res
            return res?.text
        } else {
            const res = await chain.call(obj, [loggerHandler, ...callbacks])
            if (res.text && res.sourceDocuments) return res
            return res?.text
        }
    }
}

module.exports = { nodeClass: MultiRetrievalQAChain_Chains }
