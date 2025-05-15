import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import {
    ICommonObject,
    IDatabaseEntity,
    IHumanInput,
    INode,
    INodeData,
    INodeOptionsValue,
    INodeParams,
    IServerSideEventStreamer,
    IUsedTool
} from '../../../src/Interface'
import { AIMessageChunk, BaseMessageLike, MessageContentText } from '@langchain/core/messages'
import { AnalyticHandler } from '../../../src/handler'
import { DEFAULT_SUMMARIZER_TEMPLATE } from '../prompt'
import { ILLMMessage } from '../Interface.Agentflow'
import { Tool } from '@langchain/core/tools'
import { ARTIFACTS_PREFIX, SOURCE_DOCUMENTS_PREFIX } from '../../../src/agents'
import { flatten } from 'lodash'
import zodToJsonSchema from 'zod-to-json-schema'
import { getErrorMessage } from '../../../src/error'
import { DataSource } from 'typeorm'
import {
    getPastChatHistoryImageMessages,
    getUniqueImageMessages,
    processMessagesWithImages,
    replaceBase64ImagesWithFileReferences,
    updateFlowState
} from '../utils'

interface ITool {
    agentSelectedTool: string
    agentSelectedToolConfig: ICommonObject
    agentSelectedToolRequiresHumanInput: boolean
}

interface IKnowledgeBase {
    documentStore: string
    docStoreDescription: string
    returnSourceDocuments: boolean
}

interface IKnowledgeBaseVSEmbeddings {
    vectorStore: string
    vectorStoreConfig: ICommonObject
    embeddingModel: string
    embeddingModelConfig: ICommonObject
    knowledgeName: string
    knowledgeDescription: string
    returnSourceDocuments: boolean
}

interface ISimpliefiedTool {
    name: string
    description: string
    schema: any
    toolNode: {
        label: string
        name: string
    }
}

class Agent_Agentflow implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    color: string
    baseClasses: string[]
    documentation?: string
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Agent'
        this.name = 'agentAgentflow'
        this.version = 1.0
        this.type = 'Agent'
        this.category = 'Agent Flows'
        this.description = 'Dynamically choose and utilize tools during runtime, enabling multi-step reasoning'
        this.color = '#4DD0E1'
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Model',
                name: 'agentModel',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                loadConfig: true
            },
            {
                label: 'Messages',
                name: 'agentMessages',
                type: 'array',
                optional: true,
                acceptVariable: true,
                array: [
                    {
                        label: 'Role',
                        name: 'role',
                        type: 'options',
                        options: [
                            {
                                label: 'System',
                                name: 'system'
                            },
                            {
                                label: 'Assistant',
                                name: 'assistant'
                            },
                            {
                                label: 'Developer',
                                name: 'developer'
                            },
                            {
                                label: 'User',
                                name: 'user'
                            }
                        ]
                    },
                    {
                        label: 'Content',
                        name: 'content',
                        type: 'string',
                        acceptVariable: true,
                        generateInstruction: true,
                        rows: 4
                    }
                ]
            },
            {
                label: 'Tools',
                name: 'agentTools',
                type: 'array',
                optional: true,
                array: [
                    {
                        label: 'Tool',
                        name: 'agentSelectedTool',
                        type: 'asyncOptions',
                        loadMethod: 'listTools',
                        loadConfig: true
                    },
                    {
                        label: 'Require Human Input',
                        name: 'agentSelectedToolRequiresHumanInput',
                        type: 'boolean',
                        optional: true
                    }
                ]
            },
            {
                label: 'Knowledge (Document Stores)',
                name: 'agentKnowledgeDocumentStores',
                type: 'array',
                description: 'Give your agent context about different document sources. Document stores must be upserted in advance.',
                array: [
                    {
                        label: 'Document Store',
                        name: 'documentStore',
                        type: 'asyncOptions',
                        loadMethod: 'listStores'
                    },
                    {
                        label: 'Describe Knowledge',
                        name: 'docStoreDescription',
                        type: 'string',
                        generateDocStoreDescription: true,
                        placeholder:
                            'Describe what the knowledge base is about, this is useful for the AI to know when and how to search for correct information',
                        rows: 4
                    },
                    {
                        label: 'Return Source Documents',
                        name: 'returnSourceDocuments',
                        type: 'boolean',
                        optional: true
                    }
                ],
                optional: true
            },
            {
                label: 'Knowledge (Vector Embeddings)',
                name: 'agentKnowledgeVSEmbeddings',
                type: 'array',
                description: 'Give your agent context about different document sources from existing vector stores and embeddings',
                array: [
                    {
                        label: 'Vector Store',
                        name: 'vectorStore',
                        type: 'asyncOptions',
                        loadMethod: 'listVectorStores',
                        loadConfig: true
                    },
                    {
                        label: 'Embedding Model',
                        name: 'embeddingModel',
                        type: 'asyncOptions',
                        loadMethod: 'listEmbeddings',
                        loadConfig: true
                    },
                    {
                        label: 'Knowledge Name',
                        name: 'knowledgeName',
                        type: 'string',
                        placeholder:
                            'A short name for the knowledge base, this is useful for the AI to know when and how to search for correct information'
                    },
                    {
                        label: 'Describe Knowledge',
                        name: 'knowledgeDescription',
                        type: 'string',
                        placeholder:
                            'Describe what the knowledge base is about, this is useful for the AI to know when and how to search for correct information',
                        rows: 4
                    },
                    {
                        label: 'Return Source Documents',
                        name: 'returnSourceDocuments',
                        type: 'boolean',
                        optional: true
                    }
                ],
                optional: true
            },
            {
                label: 'Enable Memory',
                name: 'agentEnableMemory',
                type: 'boolean',
                description: 'Enable memory for the conversation thread',
                default: true,
                optional: true
            },
            {
                label: 'Memory Type',
                name: 'agentMemoryType',
                type: 'options',
                options: [
                    {
                        label: 'All Messages',
                        name: 'allMessages',
                        description: 'Retrieve all messages from the conversation'
                    },
                    {
                        label: 'Window Size',
                        name: 'windowSize',
                        description: 'Uses a fixed window size to surface the last N messages'
                    },
                    {
                        label: 'Conversation Summary',
                        name: 'conversationSummary',
                        description: 'Summarizes the whole conversation'
                    },
                    {
                        label: 'Conversation Summary Buffer',
                        name: 'conversationSummaryBuffer',
                        description: 'Summarize conversations once token limit is reached. Default to 2000'
                    }
                ],
                optional: true,
                default: 'allMessages',
                show: {
                    agentEnableMemory: true
                }
            },
            {
                label: 'Window Size',
                name: 'agentMemoryWindowSize',
                type: 'number',
                default: '20',
                description: 'Uses a fixed window size to surface the last N messages',
                show: {
                    agentMemoryType: 'windowSize'
                }
            },
            {
                label: 'Max Token Limit',
                name: 'agentMemoryMaxTokenLimit',
                type: 'number',
                default: '2000',
                description: 'Summarize conversations once token limit is reached. Default to 2000',
                show: {
                    agentMemoryType: 'conversationSummaryBuffer'
                }
            },
            {
                label: 'Input Message',
                name: 'agentUserMessage',
                type: 'string',
                description: 'Add an input message as user message at the end of the conversation',
                rows: 4,
                optional: true,
                acceptVariable: true,
                show: {
                    agentEnableMemory: true
                }
            },
            {
                label: 'Return Response As',
                name: 'agentReturnResponseAs',
                type: 'options',
                options: [
                    {
                        label: 'User Message',
                        name: 'userMessage'
                    },
                    {
                        label: 'Assistant Message',
                        name: 'assistantMessage'
                    }
                ],
                default: 'userMessage'
            },
            {
                label: 'Update Flow State',
                name: 'agentUpdateState',
                description: 'Update runtime state during the execution of the workflow',
                type: 'array',
                optional: true,
                acceptVariable: true,
                array: [
                    {
                        label: 'Key',
                        name: 'key',
                        type: 'asyncOptions',
                        loadMethod: 'listRuntimeStateKeys',
                        freeSolo: true
                    },
                    {
                        label: 'Value',
                        name: 'value',
                        type: 'string',
                        acceptVariable: true,
                        acceptNodeOutputAsVariable: true
                    }
                ]
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const componentNodes = options.componentNodes as {
                [key: string]: INode
            }

            const returnOptions: INodeOptionsValue[] = []
            for (const nodeName in componentNodes) {
                const componentNode = componentNodes[nodeName]
                if (componentNode.category === 'Chat Models') {
                    if (componentNode.tags?.includes('LlamaIndex')) {
                        continue
                    }
                    returnOptions.push({
                        label: componentNode.label,
                        name: nodeName,
                        imageSrc: componentNode.icon
                    })
                }
            }
            return returnOptions
        },
        async listEmbeddings(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const componentNodes = options.componentNodes as {
                [key: string]: INode
            }

            const returnOptions: INodeOptionsValue[] = []
            for (const nodeName in componentNodes) {
                const componentNode = componentNodes[nodeName]
                if (componentNode.category === 'Embeddings') {
                    if (componentNode.tags?.includes('LlamaIndex')) {
                        continue
                    }
                    returnOptions.push({
                        label: componentNode.label,
                        name: nodeName,
                        imageSrc: componentNode.icon
                    })
                }
            }
            return returnOptions
        },
        async listTools(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const componentNodes = options.componentNodes as {
                [key: string]: INode
            }

            const removeTools = ['chainTool', 'retrieverTool', 'webBrowser']

            const returnOptions: INodeOptionsValue[] = []
            for (const nodeName in componentNodes) {
                const componentNode = componentNodes[nodeName]
                if (componentNode.category === 'Tools' || componentNode.category === 'Tools (MCP)') {
                    if (componentNode.tags?.includes('LlamaIndex')) {
                        continue
                    }
                    if (removeTools.includes(nodeName)) {
                        continue
                    }
                    returnOptions.push({
                        label: componentNode.label,
                        name: nodeName,
                        imageSrc: componentNode.icon
                    })
                }
            }
            return returnOptions
        },
        async listRuntimeStateKeys(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const previousNodes = options.previousNodes as ICommonObject[]
            const startAgentflowNode = previousNodes.find((node) => node.name === 'startAgentflow')
            const state = startAgentflowNode?.inputs?.startState as ICommonObject[]
            return state.map((item) => ({ label: item.key, name: item.key }))
        },
        async listStores(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const returnData: INodeOptionsValue[] = []

            const appDataSource = options.appDataSource as DataSource
            const databaseEntities = options.databaseEntities as IDatabaseEntity

            if (appDataSource === undefined || !appDataSource) {
                return returnData
            }

            const stores = await appDataSource.getRepository(databaseEntities['DocumentStore']).find()
            for (const store of stores) {
                if (store.status === 'UPSERTED') {
                    const obj = {
                        name: `${store.id}:${store.name}`,
                        label: store.name,
                        description: store.description
                    }
                    returnData.push(obj)
                }
            }
            return returnData
        },
        async listVectorStores(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const componentNodes = options.componentNodes as {
                [key: string]: INode
            }

            const returnOptions: INodeOptionsValue[] = []
            for (const nodeName in componentNodes) {
                const componentNode = componentNodes[nodeName]
                if (componentNode.category === 'Vector Stores') {
                    if (componentNode.tags?.includes('LlamaIndex')) {
                        continue
                    }
                    returnOptions.push({
                        label: componentNode.label,
                        name: nodeName,
                        imageSrc: componentNode.icon
                    })
                }
            }
            return returnOptions
        }
    }

    async run(nodeData: INodeData, input: string | Record<string, any>, options: ICommonObject): Promise<any> {
        let llmIds: ICommonObject | undefined
        let analyticHandlers = options.analyticHandlers as AnalyticHandler

        try {
            const abortController = options.abortController as AbortController

            // Extract input parameters
            const model = nodeData.inputs?.agentModel as string
            const modelConfig = nodeData.inputs?.agentModelConfig as ICommonObject
            if (!model) {
                throw new Error('Model is required')
            }

            // Extract tools
            const tools = nodeData.inputs?.agentTools as ITool[]

            const toolsInstance: Tool[] = []
            for (const tool of tools) {
                const toolConfig = tool.agentSelectedToolConfig
                const nodeInstanceFilePath = options.componentNodes[tool.agentSelectedTool].filePath as string
                const nodeModule = await import(nodeInstanceFilePath)
                const newToolNodeInstance = new nodeModule.nodeClass()
                const newNodeData = {
                    ...nodeData,
                    credential: toolConfig['FLOWISE_CREDENTIAL_ID'],
                    inputs: {
                        ...nodeData.inputs,
                        ...toolConfig
                    }
                }
                const toolInstance = await newToolNodeInstance.init(newNodeData, '', options)
                if (tool.agentSelectedToolRequiresHumanInput) {
                    toolInstance.requiresHumanInput = true
                }

                // toolInstance might returns a list of tools like MCP tools
                if (Array.isArray(toolInstance)) {
                    for (const subTool of toolInstance) {
                        const subToolInstance = subTool as Tool
                        ;(subToolInstance as any).agentSelectedTool = tool.agentSelectedTool
                        toolsInstance.push(subToolInstance)
                    }
                } else {
                    toolsInstance.push(toolInstance as Tool)
                }
            }

            const availableTools: ISimpliefiedTool[] = toolsInstance.map((tool, index) => {
                const originalTool = tools[index]
                let agentSelectedTool = (tool as any)?.agentSelectedTool
                if (!agentSelectedTool) {
                    agentSelectedTool = originalTool?.agentSelectedTool
                }
                const componentNode = options.componentNodes[agentSelectedTool]

                const jsonSchema = zodToJsonSchema(tool.schema)
                if (jsonSchema.$schema) {
                    delete jsonSchema.$schema
                }

                return {
                    name: tool.name,
                    description: tool.description,
                    schema: jsonSchema,
                    toolNode: {
                        label: componentNode?.label || tool.name,
                        name: componentNode?.name || tool.name
                    }
                }
            })

            // Extract knowledge
            const knowledgeBases = nodeData.inputs?.agentKnowledgeDocumentStores as IKnowledgeBase[]
            if (knowledgeBases && knowledgeBases.length > 0) {
                for (const knowledgeBase of knowledgeBases) {
                    const nodeInstanceFilePath = options.componentNodes['retrieverTool'].filePath as string
                    const nodeModule = await import(nodeInstanceFilePath)
                    const newRetrieverToolNodeInstance = new nodeModule.nodeClass()
                    const [storeId, storeName] = knowledgeBase.documentStore.split(':')

                    const docStoreVectorInstanceFilePath = options.componentNodes['documentStoreVS'].filePath as string
                    const docStoreVectorModule = await import(docStoreVectorInstanceFilePath)
                    const newDocStoreVectorInstance = new docStoreVectorModule.nodeClass()
                    const docStoreVectorInstance = await newDocStoreVectorInstance.init(
                        {
                            ...nodeData,
                            inputs: {
                                ...nodeData.inputs,
                                selectedStore: storeId
                            },
                            outputs: {
                                output: 'retriever'
                            }
                        },
                        '',
                        options
                    )

                    const newRetrieverToolNodeData = {
                        ...nodeData,
                        inputs: {
                            ...nodeData.inputs,
                            name: storeName
                                .toLowerCase()
                                .replace(/ /g, '_')
                                .replace(/[^a-z0-9_-]/g, ''),
                            description: knowledgeBase.docStoreDescription,
                            retriever: docStoreVectorInstance,
                            returnSourceDocuments: knowledgeBase.returnSourceDocuments
                        }
                    }
                    const retrieverToolInstance = await newRetrieverToolNodeInstance.init(newRetrieverToolNodeData, '', options)

                    toolsInstance.push(retrieverToolInstance as Tool)

                    const jsonSchema = zodToJsonSchema(retrieverToolInstance.schema)
                    if (jsonSchema.$schema) {
                        delete jsonSchema.$schema
                    }
                    const componentNode = options.componentNodes['retrieverTool']

                    availableTools.push({
                        name: storeName
                            .toLowerCase()
                            .replace(/ /g, '_')
                            .replace(/[^a-z0-9_-]/g, ''),
                        description: knowledgeBase.docStoreDescription,
                        schema: jsonSchema,
                        toolNode: {
                            label: componentNode?.label || retrieverToolInstance.name,
                            name: componentNode?.name || retrieverToolInstance.name
                        }
                    })
                }
            }

            const knowledgeBasesForVSEmbeddings = nodeData.inputs?.agentKnowledgeVSEmbeddings as IKnowledgeBaseVSEmbeddings[]
            if (knowledgeBasesForVSEmbeddings && knowledgeBasesForVSEmbeddings.length > 0) {
                for (const knowledgeBase of knowledgeBasesForVSEmbeddings) {
                    const nodeInstanceFilePath = options.componentNodes['retrieverTool'].filePath as string
                    const nodeModule = await import(nodeInstanceFilePath)
                    const newRetrieverToolNodeInstance = new nodeModule.nodeClass()

                    const selectedEmbeddingModel = knowledgeBase.embeddingModel
                    const selectedEmbeddingModelConfig = knowledgeBase.embeddingModelConfig
                    const embeddingInstanceFilePath = options.componentNodes[selectedEmbeddingModel].filePath as string
                    const embeddingModule = await import(embeddingInstanceFilePath)
                    const newEmbeddingInstance = new embeddingModule.nodeClass()
                    const newEmbeddingNodeData = {
                        ...nodeData,
                        credential: selectedEmbeddingModelConfig['FLOWISE_CREDENTIAL_ID'],
                        inputs: {
                            ...nodeData.inputs,
                            ...selectedEmbeddingModelConfig
                        }
                    }
                    const embeddingInstance = await newEmbeddingInstance.init(newEmbeddingNodeData, '', options)

                    const selectedVectorStore = knowledgeBase.vectorStore
                    const selectedVectorStoreConfig = knowledgeBase.vectorStoreConfig
                    const vectorStoreInstanceFilePath = options.componentNodes[selectedVectorStore].filePath as string
                    const vectorStoreModule = await import(vectorStoreInstanceFilePath)
                    const newVectorStoreInstance = new vectorStoreModule.nodeClass()
                    const newVSNodeData = {
                        ...nodeData,
                        credential: selectedVectorStoreConfig['FLOWISE_CREDENTIAL_ID'],
                        inputs: {
                            ...nodeData.inputs,
                            ...selectedVectorStoreConfig,
                            embeddings: embeddingInstance
                        },
                        outputs: {
                            output: 'retriever'
                        }
                    }
                    const vectorStoreInstance = await newVectorStoreInstance.init(newVSNodeData, '', options)

                    const knowledgeName = knowledgeBase.knowledgeName || ''

                    const newRetrieverToolNodeData = {
                        ...nodeData,
                        inputs: {
                            ...nodeData.inputs,
                            name: knowledgeName
                                .toLowerCase()
                                .replace(/ /g, '_')
                                .replace(/[^a-z0-9_-]/g, ''),
                            description: knowledgeBase.knowledgeDescription,
                            retriever: vectorStoreInstance,
                            returnSourceDocuments: knowledgeBase.returnSourceDocuments
                        }
                    }
                    const retrieverToolInstance = await newRetrieverToolNodeInstance.init(newRetrieverToolNodeData, '', options)

                    toolsInstance.push(retrieverToolInstance as Tool)

                    const jsonSchema = zodToJsonSchema(retrieverToolInstance.schema)
                    if (jsonSchema.$schema) {
                        delete jsonSchema.$schema
                    }
                    const componentNode = options.componentNodes['retrieverTool']

                    availableTools.push({
                        name: knowledgeName
                            .toLowerCase()
                            .replace(/ /g, '_')
                            .replace(/[^a-z0-9_-]/g, ''),
                        description: knowledgeBase.knowledgeDescription,
                        schema: jsonSchema,
                        toolNode: {
                            label: componentNode?.label || retrieverToolInstance.name,
                            name: componentNode?.name || retrieverToolInstance.name
                        }
                    })
                }
            }

            // Extract memory and configuration options
            const enableMemory = nodeData.inputs?.agentEnableMemory as boolean
            const memoryType = nodeData.inputs?.agentMemoryType as string
            const userMessage = nodeData.inputs?.agentUserMessage as string
            const _agentUpdateState = nodeData.inputs?.agentUpdateState
            const agentMessages = (nodeData.inputs?.agentMessages as unknown as ILLMMessage[]) ?? []

            // Extract runtime state and history
            const state = options.agentflowRuntime?.state as ICommonObject
            const pastChatHistory = (options.pastChatHistory as BaseMessageLike[]) ?? []
            const runtimeChatHistory = (options.agentflowRuntime?.chatHistory as BaseMessageLike[]) ?? []
            const chatId = options.chatId as string

            // Initialize the LLM model instance
            const nodeInstanceFilePath = options.componentNodes[model].filePath as string
            const nodeModule = await import(nodeInstanceFilePath)
            const newLLMNodeInstance = new nodeModule.nodeClass()
            const newNodeData = {
                ...nodeData,
                credential: modelConfig['FLOWISE_CREDENTIAL_ID'],
                inputs: {
                    ...nodeData.inputs,
                    ...modelConfig
                }
            }

            const llmWithoutToolsBind = (await newLLMNodeInstance.init(newNodeData, '', options)) as BaseChatModel
            let llmNodeInstance = llmWithoutToolsBind

            if (llmNodeInstance && toolsInstance.length > 0) {
                if (llmNodeInstance.bindTools === undefined) {
                    throw new Error(`Agent needs to have a function calling capable models.`)
                }

                // @ts-ignore
                llmNodeInstance = llmNodeInstance.bindTools(toolsInstance)
            }

            // Prepare messages array
            const messages: BaseMessageLike[] = []
            // Use to store messages with image file references as we do not want to store the base64 data into database
            let runtimeImageMessagesWithFileRef: BaseMessageLike[] = []
            // Use to keep track of past messages with image file references
            let pastImageMessagesWithFileRef: BaseMessageLike[] = []

            for (const msg of agentMessages) {
                const role = msg.role
                const content = msg.content
                if (role && content) {
                    messages.push({ role, content })
                }
            }

            // Handle memory management if enabled
            if (enableMemory) {
                await this.handleMemory({
                    messages,
                    memoryType,
                    pastChatHistory,
                    runtimeChatHistory,
                    llmNodeInstance,
                    nodeData,
                    userMessage,
                    input,
                    abortController,
                    options,
                    modelConfig,
                    runtimeImageMessagesWithFileRef,
                    pastImageMessagesWithFileRef
                })
            } else if (!runtimeChatHistory.length) {
                /*
                 * If this is the first node:
                 * - Add images to messages if exist
                 * - Add user message
                 */
                if (options.uploads) {
                    const imageContents = await getUniqueImageMessages(options, messages, modelConfig)
                    if (imageContents) {
                        const { imageMessageWithBase64, imageMessageWithFileRef } = imageContents
                        messages.push(imageMessageWithBase64)
                        runtimeImageMessagesWithFileRef.push(imageMessageWithFileRef)
                    }
                }

                if (input && typeof input === 'string') {
                    messages.push({
                        role: 'user',
                        content: input
                    })
                }
            }
            delete nodeData.inputs?.agentMessages

            // Initialize response and determine if streaming is possible
            let response: AIMessageChunk = new AIMessageChunk('')
            const isLastNode = options.isLastNode as boolean
            const isStreamable = isLastNode && options.sseStreamer !== undefined && modelConfig?.streaming !== false

            // Start analytics
            if (analyticHandlers && options.parentTraceIds) {
                const llmLabel = options?.componentNodes?.[model]?.label || model
                llmIds = await analyticHandlers.onLLMStart(llmLabel, messages, options.parentTraceIds)
            }

            // Track execution time
            const startTime = Date.now()

            // Get initial response from LLM
            const sseStreamer: IServerSideEventStreamer | undefined = options.sseStreamer

            // Handle tool calls with support for recursion
            let usedTools: IUsedTool[] = []
            let sourceDocuments: Array<any> = []
            let artifacts: any[] = []
            let additionalTokens = 0
            let isWaitingForHumanInput = false

            // Store the current messages length to track which messages are added during tool calls
            const messagesBeforeToolCalls = [...messages]
            let _toolCallMessages: BaseMessageLike[] = []

            // Check if this is hummanInput for tool calls
            const _humanInput = nodeData.inputs?.humanInput
            const humanInput: IHumanInput = typeof _humanInput === 'string' ? JSON.parse(_humanInput) : _humanInput
            const humanInputAction = options.humanInputAction
            const iterationContext = options.iterationContext

            if (humanInput) {
                if (humanInput.type !== 'proceed' && humanInput.type !== 'reject') {
                    throw new Error(`Invalid human input type. Expected 'proceed' or 'reject', but got '${humanInput.type}'`)
                }
                const result = await this.handleResumedToolCalls({
                    humanInput,
                    humanInputAction,
                    messages,
                    toolsInstance,
                    sseStreamer,
                    chatId,
                    input,
                    options,
                    abortController,
                    llmWithoutToolsBind,
                    isStreamable,
                    isLastNode,
                    iterationContext
                })

                response = result.response
                usedTools = result.usedTools
                sourceDocuments = result.sourceDocuments
                artifacts = result.artifacts
                additionalTokens = result.totalTokens
                isWaitingForHumanInput = result.isWaitingForHumanInput || false

                // Calculate which messages were added during tool calls
                _toolCallMessages = messages.slice(messagesBeforeToolCalls.length)

                // Stream additional data if this is the last node
                if (isLastNode && sseStreamer) {
                    if (usedTools.length > 0) {
                        sseStreamer.streamUsedToolsEvent(chatId, flatten(usedTools))
                    }

                    if (sourceDocuments.length > 0) {
                        sseStreamer.streamSourceDocumentsEvent(chatId, flatten(sourceDocuments))
                    }

                    if (artifacts.length > 0) {
                        sseStreamer.streamArtifactsEvent(chatId, flatten(artifacts))
                    }
                }
            } else {
                if (isStreamable) {
                    response = await this.handleStreamingResponse(sseStreamer, llmNodeInstance, messages, chatId, abortController)
                } else {
                    response = await llmNodeInstance.invoke(messages, { signal: abortController?.signal })
                }
            }

            if (!humanInput && response.tool_calls && response.tool_calls.length > 0) {
                const result = await this.handleToolCalls({
                    response,
                    messages,
                    toolsInstance,
                    sseStreamer,
                    chatId,
                    input,
                    options,
                    abortController,
                    llmNodeInstance,
                    isStreamable,
                    isLastNode,
                    iterationContext
                })

                response = result.response
                usedTools = result.usedTools
                sourceDocuments = result.sourceDocuments
                artifacts = result.artifacts
                additionalTokens = result.totalTokens
                isWaitingForHumanInput = result.isWaitingForHumanInput || false

                // Calculate which messages were added during tool calls
                _toolCallMessages = messages.slice(messagesBeforeToolCalls.length)

                // Stream additional data if this is the last node
                if (isLastNode && sseStreamer) {
                    if (usedTools.length > 0) {
                        sseStreamer.streamUsedToolsEvent(chatId, flatten(usedTools))
                    }

                    if (sourceDocuments.length > 0) {
                        sseStreamer.streamSourceDocumentsEvent(chatId, flatten(sourceDocuments))
                    }

                    if (artifacts.length > 0) {
                        sseStreamer.streamArtifactsEvent(chatId, flatten(artifacts))
                    }
                }
            } else if (!humanInput && !isStreamable && isLastNode && sseStreamer) {
                // Stream whole response back to UI if not streaming and no tool calls
                let responseContent = JSON.stringify(response, null, 2)
                if (typeof response.content === 'string') {
                    responseContent = response.content
                }
                sseStreamer.streamTokenEvent(chatId, responseContent)
            }

            // Calculate execution time
            const endTime = Date.now()
            const timeDelta = endTime - startTime

            // Update flow state if needed
            let newState = { ...state }
            if (_agentUpdateState && Array.isArray(_agentUpdateState) && _agentUpdateState.length > 0) {
                newState = updateFlowState(state, _agentUpdateState)
            }

            // Clean up empty inputs
            for (const key in nodeData.inputs) {
                if (nodeData.inputs[key] === '') {
                    delete nodeData.inputs[key]
                }
            }

            // Prepare final response and output object
            const finalResponse = (response.content as string) ?? JSON.stringify(response, null, 2)
            const output = this.prepareOutputObject(
                response,
                availableTools,
                finalResponse,
                startTime,
                endTime,
                timeDelta,
                usedTools,
                sourceDocuments,
                artifacts,
                additionalTokens,
                isWaitingForHumanInput
            )

            // End analytics tracking
            if (analyticHandlers && llmIds) {
                await analyticHandlers.onLLMEnd(llmIds, finalResponse)
            }

            // Send additional streaming events if needed
            if (isStreamable) {
                this.sendStreamingEvents(options, chatId, response)
            }

            // Process template variables in state
            if (newState && Object.keys(newState).length > 0) {
                for (const key in newState) {
                    if (newState[key].toString().includes('{{ output }}')) {
                        newState[key] = finalResponse
                    }
                }
            }

            // Replace the actual messages array with one that includes the file references for images instead of base64 data
            const messagesWithFileReferences = replaceBase64ImagesWithFileReferences(
                messages,
                runtimeImageMessagesWithFileRef,
                pastImageMessagesWithFileRef
            )

            // Only add to runtime chat history if this is the first node
            const inputMessages = []
            if (!runtimeChatHistory.length) {
                if (runtimeImageMessagesWithFileRef.length) {
                    inputMessages.push(...runtimeImageMessagesWithFileRef)
                }
                if (input && typeof input === 'string') {
                    inputMessages.push({ role: 'user', content: input })
                }
            }

            const returnResponseAs = nodeData.inputs?.agentReturnResponseAs as string
            let returnRole = 'user'
            if (returnResponseAs === 'assistantMessage') {
                returnRole = 'assistant'
            }

            // Prepare and return the final output
            return {
                id: nodeData.id,
                name: this.name,
                input: {
                    messages: messagesWithFileReferences,
                    ...nodeData.inputs
                },
                output,
                state: newState,
                chatHistory: [
                    ...inputMessages,

                    // Add the messages that were specifically added during tool calls, this enable other nodes to see the full tool call history, temporaraily disabled
                    // ...toolCallMessages,

                    // End with the final assistant response
                    {
                        role: returnRole,
                        content: finalResponse,
                        name: nodeData?.label ? nodeData?.label.toLowerCase().replace(/\s/g, '_').trim() : nodeData?.id
                    }
                ]
            }
        } catch (error) {
            if (options.analyticHandlers && llmIds) {
                await options.analyticHandlers.onLLMError(llmIds, error instanceof Error ? error.message : String(error))
            }

            if (error instanceof Error && error.message === 'Aborted') {
                throw error
            }
            throw new Error(`Error in Agent node: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * Handles memory management based on the specified memory type
     */
    private async handleMemory({
        messages,
        memoryType,
        pastChatHistory,
        runtimeChatHistory,
        llmNodeInstance,
        nodeData,
        userMessage,
        input,
        abortController,
        options,
        modelConfig,
        runtimeImageMessagesWithFileRef,
        pastImageMessagesWithFileRef
    }: {
        messages: BaseMessageLike[]
        memoryType: string
        pastChatHistory: BaseMessageLike[]
        runtimeChatHistory: BaseMessageLike[]
        llmNodeInstance: BaseChatModel
        nodeData: INodeData
        userMessage: string
        input: string | Record<string, any>
        abortController: AbortController
        options: ICommonObject
        modelConfig: ICommonObject
        runtimeImageMessagesWithFileRef: BaseMessageLike[]
        pastImageMessagesWithFileRef: BaseMessageLike[]
    }): Promise<void> {
        const { updatedPastMessages, transformedPastMessages } = await getPastChatHistoryImageMessages(pastChatHistory, options)
        pastChatHistory = updatedPastMessages
        pastImageMessagesWithFileRef.push(...transformedPastMessages)

        let pastMessages = [...pastChatHistory, ...runtimeChatHistory]
        if (!runtimeChatHistory.length && input && typeof input === 'string') {
            /*
             * If this is the first node:
             * - Add images to messages if exist
             * - Add user message
             */
            if (options.uploads) {
                const imageContents = await getUniqueImageMessages(options, messages, modelConfig)
                if (imageContents) {
                    const { imageMessageWithBase64, imageMessageWithFileRef } = imageContents
                    pastMessages.push(imageMessageWithBase64)
                    runtimeImageMessagesWithFileRef.push(imageMessageWithFileRef)
                }
            }
            pastMessages.push({
                role: 'user',
                content: input
            })
        }
        const { updatedMessages, transformedMessages } = await processMessagesWithImages(pastMessages, options)
        pastMessages = updatedMessages
        pastImageMessagesWithFileRef.push(...transformedMessages)

        if (pastMessages.length > 0) {
            if (memoryType === 'windowSize') {
                // Window memory: Keep the last N messages
                const windowSize = nodeData.inputs?.agentMemoryWindowSize as number
                const windowedMessages = pastMessages.slice(-windowSize * 2)
                messages.push(...windowedMessages)
            } else if (memoryType === 'conversationSummary') {
                // Summary memory: Summarize all past messages
                const summary = await llmNodeInstance.invoke(
                    [
                        {
                            role: 'user',
                            content: DEFAULT_SUMMARIZER_TEMPLATE.replace(
                                '{conversation}',
                                pastMessages.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')
                            )
                        }
                    ],
                    { signal: abortController?.signal }
                )
                messages.push({ role: 'assistant', content: summary.content as string })
            } else if (memoryType === 'conversationSummaryBuffer') {
                // Summary buffer: Summarize messages that exceed token limit
                await this.handleSummaryBuffer(messages, pastMessages, llmNodeInstance, nodeData, abortController)
            } else {
                // Default: Use all messages
                messages.push(...pastMessages)
            }
        }

        // Add user message
        if (userMessage) {
            messages.push({
                role: 'user',
                content: userMessage
            })
        }
    }

    /**
     * Handles conversation summary buffer memory type
     */
    private async handleSummaryBuffer(
        messages: BaseMessageLike[],
        pastMessages: BaseMessageLike[],
        llmNodeInstance: BaseChatModel,
        nodeData: INodeData,
        abortController: AbortController
    ): Promise<void> {
        const maxTokenLimit = (nodeData.inputs?.agentMemoryMaxTokenLimit as number) || 2000

        // Convert past messages to a format suitable for token counting
        const messagesString = pastMessages.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')
        const tokenCount = await llmNodeInstance.getNumTokens(messagesString)

        if (tokenCount > maxTokenLimit) {
            // Calculate how many messages to summarize (messages that exceed the token limit)
            let currBufferLength = tokenCount
            const messagesToSummarize = []
            const remainingMessages = [...pastMessages]

            // Remove messages from the beginning until we're under the token limit
            while (currBufferLength > maxTokenLimit && remainingMessages.length > 0) {
                const poppedMessage = remainingMessages.shift()
                if (poppedMessage) {
                    messagesToSummarize.push(poppedMessage)
                    // Recalculate token count for remaining messages
                    const remainingMessagesString = remainingMessages.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')
                    currBufferLength = await llmNodeInstance.getNumTokens(remainingMessagesString)
                }
            }

            // Summarize the messages that were removed
            const messagesToSummarizeString = messagesToSummarize.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')

            const summary = await llmNodeInstance.invoke(
                [
                    {
                        role: 'user',
                        content: DEFAULT_SUMMARIZER_TEMPLATE.replace('{conversation}', messagesToSummarizeString)
                    }
                ],
                { signal: abortController?.signal }
            )

            // Add summary as a system message at the beginning, then add remaining messages
            messages.push({ role: 'system', content: `Previous conversation summary: ${summary.content}` })
            messages.push(...remainingMessages)
        } else {
            // If under token limit, use all messages
            messages.push(...pastMessages)
        }
    }

    /**
     * Handles streaming response from the LLM
     */
    private async handleStreamingResponse(
        sseStreamer: IServerSideEventStreamer | undefined,
        llmNodeInstance: BaseChatModel,
        messages: BaseMessageLike[],
        chatId: string,
        abortController: AbortController
    ): Promise<AIMessageChunk> {
        let response = new AIMessageChunk('')

        try {
            for await (const chunk of await llmNodeInstance.stream(messages, { signal: abortController?.signal })) {
                if (sseStreamer) {
                    let content = ''
                    if (Array.isArray(chunk.content) && chunk.content.length > 0) {
                        const contents = chunk.content as MessageContentText[]
                        content = contents.map((item) => item.text).join('')
                    } else {
                        content = chunk.content.toString()
                    }
                    sseStreamer.streamTokenEvent(chatId, content)
                }

                response = response.concat(chunk)
            }
        } catch (error) {
            console.error('Error during streaming:', error)
            throw error
        }
        if (Array.isArray(response.content) && response.content.length > 0) {
            const responseContents = response.content as MessageContentText[]
            response.content = responseContents.map((item) => item.text).join('')
        }
        return response
    }

    /**
     * Prepares the output object with response and metadata
     */
    private prepareOutputObject(
        response: AIMessageChunk,
        availableTools: ISimpliefiedTool[],
        finalResponse: string,
        startTime: number,
        endTime: number,
        timeDelta: number,
        usedTools: IUsedTool[],
        sourceDocuments: Array<any>,
        artifacts: any[],
        additionalTokens: number = 0,
        isWaitingForHumanInput: boolean = false
    ): any {
        const output: any = {
            content: finalResponse,
            timeMetadata: {
                start: startTime,
                end: endTime,
                delta: timeDelta
            }
        }

        if (response.tool_calls) {
            output.calledTools = response.tool_calls
        }

        // Include token usage metadata with accumulated tokens from tool calls
        if (response.usage_metadata) {
            const originalTokens = response.usage_metadata.total_tokens || 0
            output.usageMetadata = {
                ...response.usage_metadata,
                total_tokens: originalTokens + additionalTokens,
                tool_call_tokens: additionalTokens
            }
        } else if (additionalTokens > 0) {
            // If no original usage metadata but we have tool tokens
            output.usageMetadata = {
                total_tokens: additionalTokens,
                tool_call_tokens: additionalTokens
            }
        }

        // Add used tools, source documents and artifacts to output
        if (usedTools && usedTools.length > 0) {
            output.usedTools = flatten(usedTools)
        }

        if (sourceDocuments && sourceDocuments.length > 0) {
            output.sourceDocuments = flatten(sourceDocuments)
        }

        if (artifacts && artifacts.length > 0) {
            output.artifacts = flatten(artifacts)
        }

        if (availableTools && availableTools.length > 0) {
            output.availableTools = availableTools
        }

        if (isWaitingForHumanInput) {
            output.isWaitingForHumanInput = isWaitingForHumanInput
        }

        return output
    }

    /**
     * Sends additional streaming events for tool calls and metadata
     */
    private sendStreamingEvents(options: ICommonObject, chatId: string, response: AIMessageChunk): void {
        const sseStreamer: IServerSideEventStreamer = options.sseStreamer as IServerSideEventStreamer

        if (response.tool_calls) {
            sseStreamer.streamCalledToolsEvent(chatId, response.tool_calls)
        }

        if (response.usage_metadata) {
            sseStreamer.streamUsageMetadataEvent(chatId, response.usage_metadata)
        }

        sseStreamer.streamEndEvent(chatId)
    }

    /**
     * Handles tool calls and their responses, with support for recursive tool calling
     */
    private async handleToolCalls({
        response,
        messages,
        toolsInstance,
        sseStreamer,
        chatId,
        input,
        options,
        abortController,
        llmNodeInstance,
        isStreamable,
        isLastNode,
        iterationContext
    }: {
        response: AIMessageChunk
        messages: BaseMessageLike[]
        toolsInstance: Tool[]
        sseStreamer: IServerSideEventStreamer | undefined
        chatId: string
        input: string | Record<string, any>
        options: ICommonObject
        abortController: AbortController
        llmNodeInstance: BaseChatModel
        isStreamable: boolean
        isLastNode: boolean
        iterationContext: ICommonObject
    }): Promise<{
        response: AIMessageChunk
        usedTools: IUsedTool[]
        sourceDocuments: Array<any>
        artifacts: any[]
        totalTokens: number
        isWaitingForHumanInput?: boolean
    }> {
        // Track total tokens used throughout this process
        let totalTokens = response.usage_metadata?.total_tokens || 0

        if (!response.tool_calls || response.tool_calls.length === 0) {
            return { response, usedTools: [], sourceDocuments: [], artifacts: [], totalTokens }
        }

        // Stream tool calls if available
        if (sseStreamer) {
            sseStreamer.streamCalledToolsEvent(chatId, JSON.stringify(response.tool_calls))
        }

        // Add LLM response with tool calls to messages
        messages.push({
            id: response.id,
            role: 'assistant',
            content: response.content,
            tool_calls: response.tool_calls,
            usage_metadata: response.usage_metadata
        })

        const usedTools: IUsedTool[] = []
        let sourceDocuments: Array<any> = []
        let artifacts: any[] = []

        // Process each tool call
        for (let i = 0; i < response.tool_calls.length; i++) {
            const toolCall = response.tool_calls[i]

            const selectedTool = toolsInstance.find((tool) => tool.name === toolCall.name)
            if (selectedTool) {
                let parsedDocs
                let parsedArtifacts
                let isToolRequireHumanInput =
                    (selectedTool as any).requiresHumanInput && (!iterationContext || Object.keys(iterationContext).length === 0)

                const flowConfig = {
                    sessionId: options.sessionId,
                    chatId: options.chatId,
                    input: input,
                    state: options.agentflowRuntime?.state
                }

                if (isToolRequireHumanInput) {
                    const toolCallDetails = '```json\n' + JSON.stringify(toolCall, null, 2) + '\n```'
                    const responseContent = response.content + `\nAttempting to use tool:\n${toolCallDetails}`
                    response.content = responseContent
                    sseStreamer?.streamTokenEvent(chatId, responseContent)
                    return { response, usedTools, sourceDocuments, artifacts, totalTokens, isWaitingForHumanInput: true }
                }

                try {
                    //@ts-ignore
                    let toolOutput = await selectedTool.call(toolCall.args, { signal: abortController?.signal }, undefined, flowConfig)

                    // Extract source documents if present
                    if (typeof toolOutput === 'string' && toolOutput.includes(SOURCE_DOCUMENTS_PREFIX)) {
                        const [output, docs] = toolOutput.split(SOURCE_DOCUMENTS_PREFIX)
                        toolOutput = output
                        try {
                            parsedDocs = JSON.parse(docs)
                            sourceDocuments.push(parsedDocs)
                        } catch (e) {
                            console.error('Error parsing source documents from tool:', e)
                        }
                    }

                    // Extract artifacts if present
                    if (typeof toolOutput === 'string' && toolOutput.includes(ARTIFACTS_PREFIX)) {
                        const [output, artifact] = toolOutput.split(ARTIFACTS_PREFIX)
                        toolOutput = output
                        try {
                            parsedArtifacts = JSON.parse(artifact)
                            artifacts.push(parsedArtifacts)
                        } catch (e) {
                            console.error('Error parsing artifacts from tool:', e)
                        }
                    }

                    // Add tool message to conversation
                    messages.push({
                        role: 'tool',
                        content: toolOutput,
                        tool_call_id: toolCall.id,
                        name: toolCall.name,
                        additional_kwargs: {
                            artifacts: parsedArtifacts,
                            sourceDocuments: parsedDocs
                        }
                    })

                    // Track used tools
                    usedTools.push({
                        tool: toolCall.name,
                        toolInput: toolCall.args,
                        toolOutput
                    })
                } catch (e) {
                    console.error('Error invoking tool:', e)
                    usedTools.push({
                        tool: selectedTool.name,
                        toolInput: toolCall.args,
                        toolOutput: '',
                        error: getErrorMessage(e)
                    })
                }
            }
        }

        // Return direct tool output if there's exactly one tool with returnDirect
        if (response.tool_calls.length === 1) {
            const selectedTool = toolsInstance.find((tool) => tool.name === response.tool_calls?.[0]?.name)
            if (selectedTool && selectedTool.returnDirect) {
                const lastToolOutput = usedTools[0]?.toolOutput || ''
                const lastToolOutputString = typeof lastToolOutput === 'string' ? lastToolOutput : JSON.stringify(lastToolOutput, null, 2)

                if (sseStreamer) {
                    sseStreamer.streamTokenEvent(chatId, lastToolOutputString)
                }

                return {
                    response: new AIMessageChunk(lastToolOutputString),
                    usedTools,
                    sourceDocuments,
                    artifacts,
                    totalTokens
                }
            }
        }

        // Get LLM response after tool calls
        let newResponse: AIMessageChunk

        if (isStreamable) {
            newResponse = await this.handleStreamingResponse(sseStreamer, llmNodeInstance, messages, chatId, abortController)
        } else {
            newResponse = await llmNodeInstance.invoke(messages, { signal: abortController?.signal })

            // Stream non-streaming response if this is the last node
            if (isLastNode && sseStreamer) {
                let responseContent = JSON.stringify(newResponse, null, 2)
                if (typeof newResponse.content === 'string') {
                    responseContent = newResponse.content
                }
                sseStreamer.streamTokenEvent(chatId, responseContent)
            }
        }

        // Add tokens from this response
        if (newResponse.usage_metadata?.total_tokens) {
            totalTokens += newResponse.usage_metadata.total_tokens
        }

        // Check for recursive tool calls and handle them
        if (newResponse.tool_calls && newResponse.tool_calls.length > 0) {
            const {
                response: recursiveResponse,
                usedTools: recursiveUsedTools,
                sourceDocuments: recursiveSourceDocuments,
                artifacts: recursiveArtifacts,
                totalTokens: recursiveTokens
            } = await this.handleToolCalls({
                response: newResponse,
                messages,
                toolsInstance,
                sseStreamer,
                chatId,
                input,
                options,
                abortController,
                llmNodeInstance,
                isStreamable,
                isLastNode,
                iterationContext
            })

            // Merge results from recursive tool calls
            newResponse = recursiveResponse
            usedTools.push(...recursiveUsedTools)
            sourceDocuments = [...sourceDocuments, ...recursiveSourceDocuments]
            artifacts = [...artifacts, ...recursiveArtifacts]
            totalTokens += recursiveTokens
        }

        return { response: newResponse, usedTools, sourceDocuments, artifacts, totalTokens }
    }

    /**
     * Handles tool calls and their responses, with support for recursive tool calling
     */
    private async handleResumedToolCalls({
        humanInput,
        humanInputAction,
        messages,
        toolsInstance,
        sseStreamer,
        chatId,
        input,
        options,
        abortController,
        llmWithoutToolsBind,
        isStreamable,
        isLastNode,
        iterationContext
    }: {
        humanInput: IHumanInput
        humanInputAction: Record<string, any> | undefined
        messages: BaseMessageLike[]
        toolsInstance: Tool[]
        sseStreamer: IServerSideEventStreamer | undefined
        chatId: string
        input: string | Record<string, any>
        options: ICommonObject
        abortController: AbortController
        llmWithoutToolsBind: BaseChatModel
        isStreamable: boolean
        isLastNode: boolean
        iterationContext: ICommonObject
    }): Promise<{
        response: AIMessageChunk
        usedTools: IUsedTool[]
        sourceDocuments: Array<any>
        artifacts: any[]
        totalTokens: number
        isWaitingForHumanInput?: boolean
    }> {
        let llmNodeInstance = llmWithoutToolsBind

        const lastCheckpointMessages = humanInputAction?.data?.input?.messages ?? []
        if (!lastCheckpointMessages.length) {
            return { response: new AIMessageChunk(''), usedTools: [], sourceDocuments: [], artifacts: [], totalTokens: 0 }
        }

        // Use the last message as the response
        const response = lastCheckpointMessages[lastCheckpointMessages.length - 1] as AIMessageChunk

        // Replace messages array
        messages.length = 0
        messages.push(...lastCheckpointMessages.slice(0, lastCheckpointMessages.length - 1))

        // Track total tokens used throughout this process
        let totalTokens = response.usage_metadata?.total_tokens || 0

        if (!response.tool_calls || response.tool_calls.length === 0) {
            return { response, usedTools: [], sourceDocuments: [], artifacts: [], totalTokens }
        }

        // Stream tool calls if available
        if (sseStreamer) {
            sseStreamer.streamCalledToolsEvent(chatId, JSON.stringify(response.tool_calls))
        }

        // Add LLM response with tool calls to messages
        messages.push({
            id: response.id,
            role: 'assistant',
            content: response.content,
            tool_calls: response.tool_calls,
            usage_metadata: response.usage_metadata
        })

        const usedTools: IUsedTool[] = []
        let sourceDocuments: Array<any> = []
        let artifacts: any[] = []
        let isWaitingForHumanInput: boolean | undefined

        // Process each tool call
        for (let i = 0; i < response.tool_calls.length; i++) {
            const toolCall = response.tool_calls[i]

            const selectedTool = toolsInstance.find((tool) => tool.name === toolCall.name)
            if (selectedTool) {
                let parsedDocs
                let parsedArtifacts

                const flowConfig = {
                    sessionId: options.sessionId,
                    chatId: options.chatId,
                    input: input,
                    state: options.agentflowRuntime?.state
                }

                if (humanInput.type === 'reject') {
                    messages.pop()
                    toolsInstance = toolsInstance.filter((tool) => tool.name !== toolCall.name)
                }
                if (humanInput.type === 'proceed') {
                    try {
                        //@ts-ignore
                        let toolOutput = await selectedTool.call(toolCall.args, { signal: abortController?.signal }, undefined, flowConfig)

                        // Extract source documents if present
                        if (typeof toolOutput === 'string' && toolOutput.includes(SOURCE_DOCUMENTS_PREFIX)) {
                            const [output, docs] = toolOutput.split(SOURCE_DOCUMENTS_PREFIX)
                            toolOutput = output
                            try {
                                parsedDocs = JSON.parse(docs)
                                sourceDocuments.push(parsedDocs)
                            } catch (e) {
                                console.error('Error parsing source documents from tool:', e)
                            }
                        }

                        // Extract artifacts if present
                        if (typeof toolOutput === 'string' && toolOutput.includes(ARTIFACTS_PREFIX)) {
                            const [output, artifact] = toolOutput.split(ARTIFACTS_PREFIX)
                            toolOutput = output
                            try {
                                parsedArtifacts = JSON.parse(artifact)
                                artifacts.push(parsedArtifacts)
                            } catch (e) {
                                console.error('Error parsing artifacts from tool:', e)
                            }
                        }

                        // Add tool message to conversation
                        messages.push({
                            role: 'tool',
                            content: toolOutput,
                            tool_call_id: toolCall.id,
                            name: toolCall.name,
                            additional_kwargs: {
                                artifacts: parsedArtifacts,
                                sourceDocuments: parsedDocs
                            }
                        })

                        // Track used tools
                        usedTools.push({
                            tool: toolCall.name,
                            toolInput: toolCall.args,
                            toolOutput
                        })
                    } catch (e) {
                        console.error('Error invoking tool:', e)
                        usedTools.push({
                            tool: selectedTool.name,
                            toolInput: toolCall.args,
                            toolOutput: '',
                            error: getErrorMessage(e)
                        })
                    }
                }
            }
        }

        // Return direct tool output if there's exactly one tool with returnDirect
        if (response.tool_calls.length === 1) {
            const selectedTool = toolsInstance.find((tool) => tool.name === response.tool_calls?.[0]?.name)
            if (selectedTool && selectedTool.returnDirect) {
                const lastToolOutput = usedTools[0]?.toolOutput || ''
                const lastToolOutputString = typeof lastToolOutput === 'string' ? lastToolOutput : JSON.stringify(lastToolOutput, null, 2)

                if (sseStreamer) {
                    sseStreamer.streamTokenEvent(chatId, lastToolOutputString)
                }

                return {
                    response: new AIMessageChunk(lastToolOutputString),
                    usedTools,
                    sourceDocuments,
                    artifacts,
                    totalTokens
                }
            }
        }

        // Get LLM response after tool calls
        let newResponse: AIMessageChunk

        if (llmNodeInstance && toolsInstance.length > 0) {
            if (llmNodeInstance.bindTools === undefined) {
                throw new Error(`Agent needs to have a function calling capable models.`)
            }

            // @ts-ignore
            llmNodeInstance = llmNodeInstance.bindTools(toolsInstance)
        }

        if (isStreamable) {
            newResponse = await this.handleStreamingResponse(sseStreamer, llmNodeInstance, messages, chatId, abortController)
        } else {
            newResponse = await llmNodeInstance.invoke(messages, { signal: abortController?.signal })

            // Stream non-streaming response if this is the last node
            if (isLastNode && sseStreamer) {
                let responseContent = JSON.stringify(newResponse, null, 2)
                if (typeof newResponse.content === 'string') {
                    responseContent = newResponse.content
                }
                sseStreamer.streamTokenEvent(chatId, responseContent)
            }
        }

        // Add tokens from this response
        if (newResponse.usage_metadata?.total_tokens) {
            totalTokens += newResponse.usage_metadata.total_tokens
        }

        // Check for recursive tool calls and handle them
        if (newResponse.tool_calls && newResponse.tool_calls.length > 0) {
            const {
                response: recursiveResponse,
                usedTools: recursiveUsedTools,
                sourceDocuments: recursiveSourceDocuments,
                artifacts: recursiveArtifacts,
                totalTokens: recursiveTokens,
                isWaitingForHumanInput: recursiveIsWaitingForHumanInput
            } = await this.handleToolCalls({
                response: newResponse,
                messages,
                toolsInstance,
                sseStreamer,
                chatId,
                input,
                options,
                abortController,
                llmNodeInstance,
                isStreamable,
                isLastNode,
                iterationContext
            })

            // Merge results from recursive tool calls
            newResponse = recursiveResponse
            usedTools.push(...recursiveUsedTools)
            sourceDocuments = [...sourceDocuments, ...recursiveSourceDocuments]
            artifacts = [...artifacts, ...recursiveArtifacts]
            totalTokens += recursiveTokens
            isWaitingForHumanInput = recursiveIsWaitingForHumanInput
        }

        return { response: newResponse, usedTools, sourceDocuments, artifacts, totalTokens, isWaitingForHumanInput }
    }
}

module.exports = { nodeClass: Agent_Agentflow }
