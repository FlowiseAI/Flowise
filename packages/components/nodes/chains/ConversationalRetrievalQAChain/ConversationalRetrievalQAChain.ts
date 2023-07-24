import { BaseLanguageModel } from 'langchain/base_language'
import { ICommonObject, IMessage, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { ConversationalRetrievalQAChain, QAChainParams } from 'langchain/chains'
import { AIMessage, BaseRetriever, HumanMessage } from 'langchain/schema'
import { BaseChatMemory, BufferMemory, ChatMessageHistory, BufferMemoryInput } from 'langchain/memory'
import { PromptTemplate } from 'langchain/prompts'
import { ConsoleCallbackHandler, CustomChainHandler } from '../../../src/handler'
import {
    default_map_reduce_template,
    default_qa_template,
    qa_template,
    map_reduce_template,
    CUSTOM_QUESTION_GENERATOR_CHAIN_PROMPT,
    refine_question_template,
    refine_template
} from './prompts'

class ConversationalRetrievalQAChain_Chains implements INode {
    label: string
    name: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Conversational Retrieval QA Chain'
        this.name = 'conversationalRetrievalQAChain'
        this.type = 'ConversationalRetrievalQAChain'
        this.icon = 'chain.svg'
        this.category = 'Chains'
        this.description = 'Document QA - built on RetrievalQAChain to provide a chat history component'
        this.baseClasses = [this.type, ...getBaseClasses(ConversationalRetrievalQAChain)]
        this.inputs = [
            {
                label: 'Language Model',
                name: 'model',
                type: 'BaseLanguageModel'
            },
            {
                label: 'Vector Store Retriever',
                name: 'vectorStoreRetriever',
                type: 'BaseRetriever'
            },
            {
                label: 'Memory',
                name: 'memory',
                type: 'BaseMemory',
                optional: true,
                description: 'If left empty, a default BufferMemory will be used'
            },
            {
                label: 'Return Source Documents',
                name: 'returnSourceDocuments',
                type: 'boolean',
                optional: true
            },
            {
                label: 'System Message',
                name: 'systemMessagePrompt',
                type: 'string',
                rows: 4,
                additionalParams: true,
                optional: true,
                placeholder:
                    'I want you to act as a document that I am having a conversation with. Your name is "AI Assistant". You will provide me with answers from the given info. If the answer is not included, say exactly "Hmm, I am not sure." and stop after that. Refuse to answer any question not about the info. Never break character.'
            },
            {
                label: 'Chain Option',
                name: 'chainOption',
                type: 'options',
                options: [
                    {
                        label: 'MapReduceDocumentsChain',
                        name: 'map_reduce',
                        description:
                            'Suitable for QA tasks over larger documents and can run the preprocessing step in parallel, reducing the running time'
                    },
                    {
                        label: 'RefineDocumentsChain',
                        name: 'refine',
                        description: 'Suitable for QA tasks over a large number of documents.'
                    },
                    {
                        label: 'StuffDocumentsChain',
                        name: 'stuff',
                        description: 'Suitable for QA tasks over a small number of documents.'
                    }
                ],
                additionalParams: true,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as BaseLanguageModel
        const vectorStoreRetriever = nodeData.inputs?.vectorStoreRetriever as BaseRetriever
        const systemMessagePrompt = nodeData.inputs?.systemMessagePrompt as string
        const returnSourceDocuments = nodeData.inputs?.returnSourceDocuments as boolean
        const chainOption = nodeData.inputs?.chainOption as string
        const memory = nodeData.inputs?.memory

        const obj: any = {
            verbose: process.env.DEBUG === 'true' ? true : false,
            questionGeneratorChainOptions: {
                template: CUSTOM_QUESTION_GENERATOR_CHAIN_PROMPT
            }
        }
        if (returnSourceDocuments) obj.returnSourceDocuments = returnSourceDocuments
        if (chainOption === 'map_reduce') {
            obj.qaChainOptions = {
                type: 'map_reduce',
                combinePrompt: PromptTemplate.fromTemplate(
                    systemMessagePrompt ? `${systemMessagePrompt}\n${map_reduce_template}` : default_map_reduce_template
                )
            } as QAChainParams
        } else if (chainOption === 'refine') {
            const qprompt = new PromptTemplate({
                inputVariables: ['context', 'question'],
                template: refine_question_template(systemMessagePrompt)
            })
            const rprompt = new PromptTemplate({
                inputVariables: ['context', 'question', 'existing_answer'],
                template: refine_template
            })
            obj.qaChainOptions = {
                type: 'refine',
                questionPrompt: qprompt,
                refinePrompt: rprompt
            } as QAChainParams
        } else {
            obj.qaChainOptions = {
                type: 'stuff',
                prompt: PromptTemplate.fromTemplate(systemMessagePrompt ? `${systemMessagePrompt}\n${qa_template}` : default_qa_template)
            } as QAChainParams
        }

        if (memory) {
            memory.inputKey = 'question'
            memory.memoryKey = 'chat_history'
            if (chainOption === 'refine') memory.outputKey = 'output_text'
            else memory.outputKey = 'text'
            obj.memory = memory
        } else {
            const fields: BufferMemoryInput = {
                memoryKey: 'chat_history',
                inputKey: 'question',
                returnMessages: true
            }
            if (chainOption === 'refine') fields.outputKey = 'output_text'
            else fields.outputKey = 'text'
            obj.memory = new BufferMemory(fields)
        }

        const chain = ConversationalRetrievalQAChain.fromLLM(model, vectorStoreRetriever, obj)
        return chain
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | ICommonObject> {
        const chain = nodeData.instance as ConversationalRetrievalQAChain
        const returnSourceDocuments = nodeData.inputs?.returnSourceDocuments as boolean
        const memory = nodeData.inputs?.memory
        const chainOption = nodeData.inputs?.chainOption as string

        let model = nodeData.inputs?.model

        // Temporary fix: https://github.com/hwchase17/langchainjs/issues/754
        model.streaming = false
        chain.questionGeneratorChain.llm = model

        const obj = { question: input }

        // If external memory like Zep, Redis is being used, ignore below
        if (!memory && chain.memory && options && options.chatHistory) {
            const chatHistory = []
            const histories: IMessage[] = options.chatHistory
            const memory = chain.memory as BaseChatMemory

            for (const message of histories) {
                if (message.type === 'apiMessage') {
                    chatHistory.push(new AIMessage(message.message))
                } else if (message.type === 'userMessage') {
                    chatHistory.push(new HumanMessage(message.message))
                }
            }
            memory.chatHistory = new ChatMessageHistory(chatHistory)
            chain.memory = memory
        }

        const loggerHandler = new ConsoleCallbackHandler(options.logger)

        if (options.socketIO && options.socketIOClientId) {
            const handler = new CustomChainHandler(
                options.socketIO,
                options.socketIOClientId,
                chainOption === 'refine' ? 4 : undefined,
                returnSourceDocuments
            )
            const res = await chain.call(obj, [loggerHandler, handler])
            if (chainOption === 'refine') {
                if (res.output_text && res.sourceDocuments) {
                    return {
                        text: res.output_text,
                        sourceDocuments: res.sourceDocuments
                    }
                }
                return res?.output_text
            }
            if (res.text && res.sourceDocuments) return res
            return res?.text
        } else {
            const res = await chain.call(obj, [loggerHandler])
            if (res.text && res.sourceDocuments) return res
            return res?.text
        }
    }
}

module.exports = { nodeClass: ConversationalRetrievalQAChain_Chains }
