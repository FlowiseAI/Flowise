import { applyPatch } from 'fast-json-patch'
import { DataSource } from 'typeorm'
import { BaseLanguageModel } from '@langchain/core/language_models/base'
import { BaseRetriever } from '@langchain/core/retrievers'
import { PromptTemplate, ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { Runnable, RunnableSequence, RunnableMap, RunnableBranch, RunnableLambda } from '@langchain/core/runnables'
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages'
import { ConsoleCallbackHandler as LCConsoleCallbackHandler } from '@langchain/core/tracers/console'
import { checkInputs, Moderation, streamResponse } from '../../moderation/Moderation'
import { formatResponse } from '../../outputparsers/OutputParserHelpers'
import { StringOutputParser } from '@langchain/core/output_parsers'
import type { Document } from '@langchain/core/documents'
import { BufferMemoryInput } from 'langchain/memory'
import { ConversationalRetrievalQAChain } from 'langchain/chains'
import { getBaseClasses, mapChatMessageToBaseMessage } from '../../../src/utils'
import { ConsoleCallbackHandler, additionalCallbacks } from '../../../src/handler'
import {
    FlowiseMemory,
    ICommonObject,
    IMessage,
    INode,
    INodeData,
    INodeParams,
    IDatabaseEntity,
    MemoryMethods,
    IServerSideEventStreamer
} from '../../../src/Interface'
import { QA_TEMPLATE, REPHRASE_TEMPLATE, RESPONSE_TEMPLATE } from './prompts'

type RetrievalChainInput = {
    chat_history: string
    question: string
}

const sourceRunnableName = 'FindDocs'

class ConversationalRetrievalQAChain_Chains implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    baseClasses: string[]
    description: string
    inputs: INodeParams[]
    sessionId?: string

    constructor(fields?: { sessionId?: string }) {
        this.label = 'Conversational Retrieval QA Chain'
        this.name = 'conversationalRetrievalQAChain'
        this.version = 3.0
        this.type = 'ConversationalRetrievalQAChain'
        this.icon = 'qa.svg'
        this.category = 'Chains'
        this.description = 'Document QA - built on RetrievalQAChain to provide a chat history component'
        this.baseClasses = [this.type, ...getBaseClasses(ConversationalRetrievalQAChain)]
        this.inputs = [
            {
                label: 'Chat Model',
                name: 'model',
                type: 'BaseChatModel'
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
                label: 'Rephrase Prompt',
                name: 'rephrasePrompt',
                type: 'string',
                description: 'Using previous chat history, rephrase question into a standalone question',
                warning: 'Prompt must include input variables: {chat_history} and {question}',
                rows: 4,
                additionalParams: true,
                optional: true,
                default: REPHRASE_TEMPLATE
            },
            {
                label: 'Response Prompt',
                name: 'responsePrompt',
                type: 'string',
                description: 'Taking the rephrased question, search for answer from the provided context',
                warning: 'Prompt must include input variable: {context}',
                rows: 4,
                additionalParams: true,
                optional: true,
                default: RESPONSE_TEMPLATE
            },
            {
                label: 'Input Moderation',
                description: 'Detect text that could generate harmful output and prevent it from being sent to the language model',
                name: 'inputModeration',
                type: 'Moderation',
                optional: true,
                list: true
            }
            /** Deprecated
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
            // TODO: create standalone chains for these 3 modes as they are not compatible with memory
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
            */
        ]
        this.sessionId = fields?.sessionId
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as BaseLanguageModel
        const vectorStoreRetriever = nodeData.inputs?.vectorStoreRetriever as BaseRetriever
        const systemMessagePrompt = nodeData.inputs?.systemMessagePrompt as string
        const rephrasePrompt = nodeData.inputs?.rephrasePrompt as string
        const responsePrompt = nodeData.inputs?.responsePrompt as string

        let customResponsePrompt = responsePrompt
        // If the deprecated systemMessagePrompt is still exists
        if (systemMessagePrompt) {
            customResponsePrompt = `${systemMessagePrompt}\n${QA_TEMPLATE}`
        }

        const answerChain = createChain(model, vectorStoreRetriever, rephrasePrompt, customResponsePrompt)
        return answerChain
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | ICommonObject> {
        const model = nodeData.inputs?.model as BaseLanguageModel
        const externalMemory = nodeData.inputs?.memory
        const vectorStoreRetriever = nodeData.inputs?.vectorStoreRetriever as BaseRetriever
        const systemMessagePrompt = nodeData.inputs?.systemMessagePrompt as string
        const rephrasePrompt = nodeData.inputs?.rephrasePrompt as string
        const responsePrompt = nodeData.inputs?.responsePrompt as string
        const returnSourceDocuments = nodeData.inputs?.returnSourceDocuments as boolean
        const prependMessages = options?.prependMessages

        const appDataSource = options.appDataSource as DataSource
        const databaseEntities = options.databaseEntities as IDatabaseEntity
        const chatflowid = options.chatflowid as string

        const shouldStreamResponse = options.shouldStreamResponse
        const sseStreamer: IServerSideEventStreamer = options.sseStreamer as IServerSideEventStreamer
        const chatId = options.chatId
        const orgId = options.orgId

        let customResponsePrompt = responsePrompt
        // If the deprecated systemMessagePrompt is still exists
        if (systemMessagePrompt) {
            customResponsePrompt = `${systemMessagePrompt}\n${QA_TEMPLATE}`
        }

        let memory: FlowiseMemory | undefined = externalMemory
        const moderations = nodeData.inputs?.inputModeration as Moderation[]
        if (!memory) {
            memory = new BufferMemory({
                returnMessages: true,
                memoryKey: 'chat_history',
                appDataSource,
                databaseEntities,
                chatflowid,
                orgId
            })
        }

        if (moderations && moderations.length > 0) {
            try {
                // Use the output of the moderation chain as input for the Conversational Retrieval QA Chain
                input = await checkInputs(moderations, input)
            } catch (e) {
                await new Promise((resolve) => setTimeout(resolve, 500))
                if (options.shouldStreamResponse) {
                    streamResponse(options.sseStreamer, options.chatId, e.message)
                }
                return formatResponse(e.message)
            }
        }
        const answerChain = createChain(model, vectorStoreRetriever, rephrasePrompt, customResponsePrompt)

        const history = ((await memory.getChatMessages(this.sessionId, false, prependMessages)) as IMessage[]) ?? []

        const loggerHandler = new ConsoleCallbackHandler(options.logger, options?.orgId)
        const additionalCallback = await additionalCallbacks(nodeData, options)

        let callbacks = [loggerHandler, ...additionalCallback]

        if (process.env.DEBUG === 'true') {
            callbacks.push(new LCConsoleCallbackHandler())
        }

        const stream = answerChain.streamLog(
            { question: input, chat_history: history },
            { callbacks },
            {
                includeNames: [sourceRunnableName]
            }
        )

        let streamedResponse: Record<string, any> = {}
        let sourceDocuments: ICommonObject[] = []
        let text = ''
        let isStreamingStarted = false

        for await (const chunk of stream) {
            streamedResponse = applyPatch(streamedResponse, chunk.ops).newDocument

            if (streamedResponse.final_output) {
                text = streamedResponse.final_output?.output
                if (Array.isArray(streamedResponse?.logs?.[sourceRunnableName]?.final_output?.output)) {
                    sourceDocuments = streamedResponse?.logs?.[sourceRunnableName]?.final_output?.output
                    if (shouldStreamResponse && returnSourceDocuments) {
                        if (sseStreamer) {
                            sseStreamer.streamSourceDocumentsEvent(chatId, sourceDocuments)
                        }
                    }
                }
                if (shouldStreamResponse && sseStreamer) {
                    sseStreamer.streamEndEvent(chatId)
                }
            }

            if (
                Array.isArray(streamedResponse?.streamed_output) &&
                streamedResponse?.streamed_output.length &&
                !streamedResponse.final_output
            ) {
                const token = streamedResponse.streamed_output[streamedResponse.streamed_output.length - 1]

                if (!isStreamingStarted) {
                    isStreamingStarted = true
                    if (shouldStreamResponse) {
                        if (sseStreamer) {
                            sseStreamer.streamStartEvent(chatId, token)
                        }
                    }
                }
                if (shouldStreamResponse) {
                    if (sseStreamer) {
                        sseStreamer.streamTokenEvent(chatId, token)
                    }
                }
            }
        }

        await memory.addChatMessages(
            [
                {
                    text: input,
                    type: 'userMessage'
                },
                {
                    text: text,
                    type: 'apiMessage'
                }
            ],
            this.sessionId
        )

        if (returnSourceDocuments) return { text, sourceDocuments }
        else return { text }
    }
}

const createRetrieverChain = (llm: BaseLanguageModel, retriever: Runnable, rephrasePrompt: string) => {
    // Small speed/accuracy optimization: no need to rephrase the first question
    // since there shouldn't be any meta-references to prior chat history
    const CONDENSE_QUESTION_PROMPT = PromptTemplate.fromTemplate(rephrasePrompt)
    const condenseQuestionChain = RunnableSequence.from([CONDENSE_QUESTION_PROMPT, llm, new StringOutputParser()]).withConfig({
        runName: 'CondenseQuestion'
    })

    const hasHistoryCheckFn = RunnableLambda.from((input: RetrievalChainInput) => input.chat_history.length > 0).withConfig({
        runName: 'HasChatHistoryCheck'
    })

    const conversationChain = condenseQuestionChain.pipe(retriever).withConfig({
        runName: 'RetrievalChainWithHistory'
    })

    const basicRetrievalChain = RunnableLambda.from((input: RetrievalChainInput) => input.question)
        .withConfig({
            runName: 'Itemgetter:question'
        })
        .pipe(retriever)
        .withConfig({ runName: 'RetrievalChainWithNoHistory' })

    return RunnableBranch.from([[hasHistoryCheckFn, conversationChain], basicRetrievalChain]).withConfig({ runName: sourceRunnableName })
}

const formatDocs = (docs: Document[]) => {
    return docs.map((doc, i) => `<doc id='${i}'>${doc.pageContent}</doc>`).join('\n')
}

const formatChatHistoryAsString = (history: BaseMessage[]) => {
    return history.map((message) => `${message._getType()}: ${message.content}`).join('\n')
}

const serializeHistory = (input: any) => {
    const chatHistory: IMessage[] = input.chat_history || []
    const convertedChatHistory = []
    for (const message of chatHistory) {
        if (message.type === 'userMessage') {
            convertedChatHistory.push(new HumanMessage({ content: message.message }))
        }
        if (message.type === 'apiMessage') {
            convertedChatHistory.push(new AIMessage({ content: message.message }))
        }
    }
    return convertedChatHistory
}

const createChain = (
    llm: BaseLanguageModel,
    retriever: Runnable,
    rephrasePrompt = REPHRASE_TEMPLATE,
    responsePrompt = RESPONSE_TEMPLATE
) => {
    const retrieverChain = createRetrieverChain(llm, retriever, rephrasePrompt)

    const context = RunnableMap.from({
        context: RunnableSequence.from([
            ({ question, chat_history }) => ({
                question,
                chat_history: formatChatHistoryAsString(chat_history)
            }),
            retrieverChain,
            RunnableLambda.from(formatDocs).withConfig({
                runName: 'FormatDocumentChunks'
            })
        ]),
        question: RunnableLambda.from((input: RetrievalChainInput) => input.question).withConfig({
            runName: 'Itemgetter:question'
        }),
        chat_history: RunnableLambda.from((input: RetrievalChainInput) => input.chat_history).withConfig({
            runName: 'Itemgetter:chat_history'
        })
    }).withConfig({ tags: ['RetrieveDocs'] })

    const prompt = ChatPromptTemplate.fromMessages([
        ['system', responsePrompt],
        new MessagesPlaceholder('chat_history'),
        ['human', `{question}`]
    ])

    const responseSynthesizerChain = RunnableSequence.from([prompt, llm, new StringOutputParser()]).withConfig({
        tags: ['GenerateResponse']
    })

    const conversationalQAChain = RunnableSequence.from([
        {
            question: RunnableLambda.from((input: RetrievalChainInput) => input.question).withConfig({
                runName: 'Itemgetter:question'
            }),
            chat_history: RunnableLambda.from(serializeHistory).withConfig({
                runName: 'SerializeHistory'
            })
        },
        context,
        responseSynthesizerChain
    ])

    return conversationalQAChain
}

interface BufferMemoryExtendedInput {
    appDataSource: DataSource
    databaseEntities: IDatabaseEntity
    chatflowid: string
    orgId: string
}

class BufferMemory extends FlowiseMemory implements MemoryMethods {
    appDataSource: DataSource
    databaseEntities: IDatabaseEntity
    chatflowid: string
    orgId: string

    constructor(fields: BufferMemoryInput & BufferMemoryExtendedInput) {
        super(fields)
        this.appDataSource = fields.appDataSource
        this.databaseEntities = fields.databaseEntities
        this.chatflowid = fields.chatflowid
        this.orgId = fields.orgId
    }

    async getChatMessages(
        overrideSessionId = '',
        returnBaseMessages = false,
        prependMessages?: IMessage[]
    ): Promise<IMessage[] | BaseMessage[]> {
        if (!overrideSessionId) return []

        const chatMessage = await this.appDataSource.getRepository(this.databaseEntities['ChatMessage']).find({
            where: {
                sessionId: overrideSessionId,
                chatflowid: this.chatflowid
            },
            order: {
                createdDate: 'ASC'
            }
        })

        if (prependMessages?.length) {
            chatMessage.unshift(...prependMessages)
        }

        if (returnBaseMessages) {
            return await mapChatMessageToBaseMessage(chatMessage, this.orgId)
        }

        let returnIMessages: IMessage[] = []
        for (const m of chatMessage) {
            returnIMessages.push({
                message: m.content as string,
                type: m.role
            })
        }
        return returnIMessages
    }

    async addChatMessages(): Promise<void> {
        // adding chat messages is done on server level
        return
    }

    async clearChatMessages(): Promise<void> {
        // clearing chat messages is done on server level
        return
    }
}

module.exports = { nodeClass: ConversationalRetrievalQAChain_Chains }
