import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import {
    ICommonObject,
    IDatabaseEntity,
    IHumanInput,
    IMessage,
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
import { ARTIFACTS_PREFIX, SOURCE_DOCUMENTS_PREFIX, TOOL_ARGS_PREFIX } from '../../../src/agents'
import { flatten } from 'lodash'
import zodToJsonSchema from 'zod-to-json-schema'
import { getErrorMessage } from '../../../src/error'
import { DataSource } from 'typeorm'
import {
    addImageArtifactsToMessages,
    extractArtifactsFromResponse,
    getPastChatHistoryImageMessages,
    getUniqueImageMessages,
    processMessagesWithImages,
    replaceBase64ImagesWithFileReferences,
    replaceInlineDataWithFileReferences,
    updateFlowState
} from '../utils'
import { convertMultiOptionsToStringArray, processTemplateVariables, configureStructuredOutput } from '../../../src/utils'

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
        this.version = 3.2
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
                label: 'OpenAI Built-in Tools',
                name: 'agentToolsBuiltInOpenAI',
                type: 'multiOptions',
                optional: true,
                options: [
                    {
                        label: 'Web Search',
                        name: 'web_search_preview',
                        description: 'Search the web for the latest information'
                    },
                    {
                        label: 'Code Interpreter',
                        name: 'code_interpreter',
                        description: 'Write and run Python code in a sandboxed environment'
                    },
                    {
                        label: 'Image Generation',
                        name: 'image_generation',
                        description: 'Generate images based on a text prompt'
                    }
                ],
                show: {
                    agentModel: 'chatOpenAI'
                }
            },
            {
                label: 'Gemini Built-in Tools',
                name: 'agentToolsBuiltInGemini',
                type: 'multiOptions',
                optional: true,
                options: [
                    {
                        label: 'URL Context',
                        name: 'urlContext',
                        description: 'Extract content from given URLs'
                    },
                    {
                        label: 'Google Search',
                        name: 'googleSearch',
                        description: 'Search real-time web content'
                    },
                    {
                        label: 'Code Execution',
                        name: 'codeExecution',
                        description: 'Write and run Python code in a sandboxed environment'
                    }
                ],
                show: {
                    agentModel: 'chatGoogleGenerativeAI'
                }
            },
            {
                label: 'Anthropic Built-in Tools',
                name: 'agentToolsBuiltInAnthropic',
                type: 'multiOptions',
                optional: true,
                options: [
                    {
                        label: 'Web Search',
                        name: 'web_search_20250305',
                        description: 'Search the web for the latest information'
                    },
                    {
                        label: 'Web Fetch',
                        name: 'web_fetch_20250910',
                        description: 'Retrieve full content from specified web pages'
                    }
                    /*
                    * Not supported yet as we need to get bash_code_execution_tool_result from content:
                    https://docs.claude.com/en/docs/agents-and-tools/tool-use/code-execution-tool#retrieve-generated-files
                    {
                        label: 'Code Interpreter',
                        name: 'code_execution_20250825',
                        description: 'Write and run Python code in a sandboxed environment'
                    }*/
                ],
                show: {
                    agentModel: 'chatAnthropic'
                }
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
                label: 'JSON Structured Output',
                name: 'agentStructuredOutput',
                description: 'Instruct the Agent to give output in a JSON structured schema',
                type: 'array',
                optional: true,
                acceptVariable: true,
                array: [
                    {
                        label: 'Key',
                        name: 'key',
                        type: 'string'
                    },
                    {
                        label: 'Type',
                        name: 'type',
                        type: 'options',
                        options: [
                            {
                                label: 'String',
                                name: 'string'
                            },
                            {
                                label: 'String Array',
                                name: 'stringArray'
                            },
                            {
                                label: 'Number',
                                name: 'number'
                            },
                            {
                                label: 'Boolean',
                                name: 'boolean'
                            },
                            {
                                label: 'Enum',
                                name: 'enum'
                            },
                            {
                                label: 'JSON Array',
                                name: 'jsonArray'
                            }
                        ]
                    },
                    {
                        label: 'Enum Values',
                        name: 'enumValues',
                        type: 'string',
                        placeholder: 'value1, value2, value3',
                        description: 'Enum values. Separated by comma',
                        optional: true,
                        show: {
                            'agentStructuredOutput[$index].type': 'enum'
                        }
                    },
                    {
                        label: 'JSON Schema',
                        name: 'jsonSchema',
                        type: 'code',
                        placeholder: `{
    "answer": {
        "type": "string",
        "description": "Value of the answer"
    },
    "reason": {
        "type": "string",
        "description": "Reason for the answer"
    },
    "optional": {
        "type": "boolean"
    },
    "count": {
        "type": "number"
    },
    "children": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string",
                    "description": "Value of the children's answer"
                }
            }
        }
    }
}`,
                        description: 'JSON schema for the structured output',
                        optional: true,
                        hideCodeExecute: true,
                        show: {
                            'agentStructuredOutput[$index].type': 'jsonArray'
                        }
                    },
                    {
                        label: 'Description',
                        name: 'description',
                        type: 'string',
                        placeholder: 'Description of the key'
                    }
                ]
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
                        loadMethod: 'listRuntimeStateKeys'
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

            const searchOptions = options.searchOptions || {}
            const stores = await appDataSource.getRepository(databaseEntities['DocumentStore']).findBy(searchOptions)
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

                // toolInstance might returns a list of tools like MCP tools
                if (Array.isArray(toolInstance)) {
                    for (const subTool of toolInstance) {
                        const subToolInstance = subTool as Tool
                        ;(subToolInstance as any).agentSelectedTool = tool.agentSelectedTool
                        if (tool.agentSelectedToolRequiresHumanInput) {
                            ;(subToolInstance as any).requiresHumanInput = true
                        }
                        toolsInstance.push(subToolInstance)
                    }
                } else {
                    if (tool.agentSelectedToolRequiresHumanInput) {
                        toolInstance.requiresHumanInput = true
                    }
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

                const jsonSchema = zodToJsonSchema(tool.schema as any)
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
            const _agentStructuredOutput = nodeData.inputs?.agentStructuredOutput
            const agentMessages = (nodeData.inputs?.agentMessages as unknown as ILLMMessage[]) ?? []

            // Extract runtime state and history
            const state = options.agentflowRuntime?.state as ICommonObject
            const pastChatHistory = (options.pastChatHistory as BaseMessageLike[]) ?? []
            const runtimeChatHistory = (options.agentflowRuntime?.chatHistory as BaseMessageLike[]) ?? []
            const prependedChatHistory = options.prependedChatHistory as IMessage[]
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

            const isStructuredOutput = _agentStructuredOutput && Array.isArray(_agentStructuredOutput) && _agentStructuredOutput.length > 0

            const agentToolsBuiltInOpenAI = convertMultiOptionsToStringArray(nodeData.inputs?.agentToolsBuiltInOpenAI)
            if (agentToolsBuiltInOpenAI && agentToolsBuiltInOpenAI.length > 0) {
                for (const tool of agentToolsBuiltInOpenAI) {
                    const builtInTool: ICommonObject = {
                        type: tool
                    }
                    if (tool === 'code_interpreter') {
                        builtInTool.container = { type: 'auto' }
                    }
                    ;(toolsInstance as any).push(builtInTool)
                    ;(availableTools as any).push({
                        name: tool,
                        toolNode: {
                            label: tool,
                            name: tool
                        }
                    })
                }
            }

            const agentToolsBuiltInGemini = convertMultiOptionsToStringArray(nodeData.inputs?.agentToolsBuiltInGemini)
            if (agentToolsBuiltInGemini && agentToolsBuiltInGemini.length > 0) {
                for (const tool of agentToolsBuiltInGemini) {
                    const builtInTool: ICommonObject = {
                        [tool]: {}
                    }
                    ;(toolsInstance as any).push(builtInTool)
                    ;(availableTools as any).push({
                        name: tool,
                        toolNode: {
                            label: tool,
                            name: tool
                        }
                    })
                }
            }

            const agentToolsBuiltInAnthropic = convertMultiOptionsToStringArray(nodeData.inputs?.agentToolsBuiltInAnthropic)
            if (agentToolsBuiltInAnthropic && agentToolsBuiltInAnthropic.length > 0) {
                for (const tool of agentToolsBuiltInAnthropic) {
                    // split _ to get the tool name by removing the last part (date)
                    const toolName = tool.split('_').slice(0, -1).join('_')

                    if (tool === 'code_execution_20250825') {
                        ;(llmNodeInstance as any).clientOptions = {
                            defaultHeaders: {
                                'anthropic-beta': ['code-execution-2025-08-25', 'files-api-2025-04-14']
                            }
                        }
                    }

                    if (tool === 'web_fetch_20250910') {
                        ;(llmNodeInstance as any).clientOptions = {
                            defaultHeaders: {
                                'anthropic-beta': ['web-fetch-2025-09-10']
                            }
                        }
                    }

                    const builtInTool: ICommonObject = {
                        type: tool,
                        name: toolName
                    }
                    ;(toolsInstance as any).push(builtInTool)
                    ;(availableTools as any).push({
                        name: tool,
                        toolNode: {
                            label: tool,
                            name: tool
                        }
                    })
                }
            }

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

            // Prepend history ONLY if it is the first node
            if (prependedChatHistory.length > 0 && !runtimeChatHistory.length) {
                for (const msg of prependedChatHistory) {
                    const role: string = msg.role === 'apiMessage' ? 'assistant' : 'user'
                    const content: string = msg.content ?? ''
                    messages.push({
                        role,
                        content
                    })
                }
            }

            for (const msg of agentMessages) {
                const role = msg.role
                const content = msg.content
                if (role && content) {
                    if (role === 'system') {
                        messages.unshift({ role, content })
                    } else {
                        messages.push({ role, content })
                    }
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
                 * - Add user message if it does not exist in the agentMessages array
                 */
                if (options.uploads) {
                    const imageContents = await getUniqueImageMessages(options, messages, modelConfig)
                    if (imageContents) {
                        const { imageMessageWithBase64, imageMessageWithFileRef } = imageContents
                        messages.push(imageMessageWithBase64)
                        runtimeImageMessagesWithFileRef.push(imageMessageWithFileRef)
                    }
                }

                if (input && typeof input === 'string' && !agentMessages.some((msg) => msg.role === 'user')) {
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
            const isStreamable = isLastNode && options.sseStreamer !== undefined && modelConfig?.streaming !== false && !isStructuredOutput

            // Start analytics
            if (analyticHandlers && options.parentTraceIds) {
                const llmLabel = options?.componentNodes?.[model]?.label || model
                llmIds = await analyticHandlers.onLLMStart(llmLabel, messages, options.parentTraceIds)
            }

            // Handle tool calls with support for recursion
            let usedTools: IUsedTool[] = []
            let sourceDocuments: Array<any> = []
            let artifacts: any[] = []
            let fileAnnotations: any[] = []
            let additionalTokens = 0
            let isWaitingForHumanInput = false

            // Store the current messages length to track which messages are added during tool calls
            const messagesBeforeToolCalls = [...messages]
            let _toolCallMessages: BaseMessageLike[] = []

            /**
             * Add image artifacts from previous assistant responses as user messages
             * Images are converted from FILE-STORAGE::<image_path> to base 64 image_url format
             */
            await addImageArtifactsToMessages(messages, options)

            // Check if this is hummanInput for tool calls
            const _humanInput = nodeData.inputs?.humanInput
            const humanInput: IHumanInput = typeof _humanInput === 'string' ? JSON.parse(_humanInput) : _humanInput
            const humanInputAction = options.humanInputAction
            const iterationContext = options.iterationContext

            // Track execution time
            const startTime = Date.now()

            // Get initial response from LLM
            const sseStreamer: IServerSideEventStreamer | undefined = options.sseStreamer

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
                    iterationContext,
                    isStructuredOutput
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
                    response = await this.handleStreamingResponse(
                        sseStreamer,
                        llmNodeInstance,
                        messages,
                        chatId,
                        abortController,
                        isStructuredOutput
                    )
                } else {
                    response = await llmNodeInstance.invoke(messages, { signal: abortController?.signal })
                }
            }

            // Address built in tools (after artifacts are processed)
            const builtInUsedTools: IUsedTool[] = await this.extractBuiltInUsedTools(response, [])

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
                    iterationContext,
                    isStructuredOutput
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
            } else if (!humanInput && !isStreamable && isLastNode && sseStreamer && !isStructuredOutput) {
                // Stream whole response back to UI if not streaming and no tool calls
                // Skip this if structured output is enabled - it will be streamed after conversion
                let finalResponse = ''
                if (response.content && Array.isArray(response.content)) {
                    finalResponse = response.content
                        .map((item: any) => {
                            if ((item.text && !item.type) || (item.type === 'text' && item.text)) {
                                return item.text
                            }
                            return ''
                        })
                        .filter((text: string) => text)
                        .join('\n')
                } else if (response.content && typeof response.content === 'string') {
                    finalResponse = response.content
                } else {
                    finalResponse = JSON.stringify(response, null, 2)
                }
                sseStreamer.streamTokenEvent(chatId, finalResponse)
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
            let finalResponse = ''
            if (response.content && Array.isArray(response.content)) {
                // Process items and concatenate consecutive text items
                const processedParts: string[] = []
                let currentTextBuffer = ''

                for (const item of response.content) {
                    const itemAny = item as any
                    const isTextItem = (itemAny.text && !itemAny.type) || (itemAny.type === 'text' && itemAny.text)

                    if (isTextItem) {
                        // Accumulate consecutive text items
                        currentTextBuffer += itemAny.text
                    } else {
                        // Flush accumulated text before processing other types
                        if (currentTextBuffer) {
                            processedParts.push(currentTextBuffer)
                            currentTextBuffer = ''
                        }

                        // Process non-text items
                        if (itemAny.type === 'executableCode' && itemAny.executableCode) {
                            // Format executable code as a code block
                            const language = itemAny.executableCode.language?.toLowerCase() || 'python'
                            processedParts.push(`\n\`\`\`${language}\n${itemAny.executableCode.code}\n\`\`\`\n`)
                        } else if (itemAny.type === 'codeExecutionResult' && itemAny.codeExecutionResult) {
                            // Format code execution result
                            const outcome = itemAny.codeExecutionResult.outcome || 'OUTCOME_OK'
                            const output = itemAny.codeExecutionResult.output || ''
                            if (outcome === 'OUTCOME_OK' && output) {
                                processedParts.push(`**Code Output:**\n\`\`\`\n${output}\n\`\`\`\n`)
                            } else if (outcome !== 'OUTCOME_OK') {
                                processedParts.push(`**Code Execution Error:**\n\`\`\`\n${output}\n\`\`\`\n`)
                            }
                        }
                    }
                }

                // Flush any remaining text
                if (currentTextBuffer) {
                    processedParts.push(currentTextBuffer)
                }

                finalResponse = processedParts.filter((text) => text).join('\n')
            } else if (response.content && typeof response.content === 'string') {
                finalResponse = response.content
            } else if (response.content === '') {
                // Empty response content, this could happen when there is only image data
                finalResponse = ''
            } else {
                finalResponse = JSON.stringify(response, null, 2)
            }

            // Address built in tools
            const additionalBuiltInUsedTools: IUsedTool[] = await this.extractBuiltInUsedTools(response, builtInUsedTools)
            if (additionalBuiltInUsedTools.length > 0) {
                usedTools = [...new Set([...usedTools, ...additionalBuiltInUsedTools])]

                // Stream used tools if this is the last node
                if (isLastNode && sseStreamer) {
                    sseStreamer.streamUsedToolsEvent(chatId, flatten(usedTools))
                }
            }

            // Extract artifacts from annotations in response metadata and replace inline data
            if (response.response_metadata) {
                const {
                    artifacts: extractedArtifacts,
                    fileAnnotations: extractedFileAnnotations,
                    savedInlineImages
                } = await extractArtifactsFromResponse(response.response_metadata, newNodeData, options)
                if (extractedArtifacts.length > 0) {
                    artifacts = [...artifacts, ...extractedArtifacts]

                    // Stream artifacts if this is the last node
                    if (isLastNode && sseStreamer) {
                        sseStreamer.streamArtifactsEvent(chatId, extractedArtifacts)
                    }
                }

                if (extractedFileAnnotations.length > 0) {
                    fileAnnotations = [...fileAnnotations, ...extractedFileAnnotations]

                    // Stream file annotations if this is the last node
                    if (isLastNode && sseStreamer) {
                        sseStreamer.streamFileAnnotationsEvent(chatId, fileAnnotations)
                    }
                }

                // Replace inlineData base64 with file references in the response
                if (savedInlineImages && savedInlineImages.length > 0) {
                    replaceInlineDataWithFileReferences(response, savedInlineImages)
                }
            }

            // Replace sandbox links with proper download URLs. Example: [Download the script](sandbox:/mnt/data/dummy_bar_graph.py)
            if (finalResponse.includes('sandbox:/')) {
                finalResponse = await this.processSandboxLinks(finalResponse, options.baseURL, options.chatflowid, chatId)
            }

            // If is structured output, then invoke LLM again with structured output at the very end after all tool calls
            if (isStructuredOutput) {
                llmNodeInstance = configureStructuredOutput(llmNodeInstance, _agentStructuredOutput)
                const prompt = 'Convert the following response to the structured output format: ' + finalResponse
                response = await llmNodeInstance.invoke(prompt, { signal: abortController?.signal })

                if (typeof response === 'object') {
                    finalResponse = '```json\n' + JSON.stringify(response, null, 2) + '\n```'
                } else {
                    finalResponse = response
                }

                if (isLastNode && sseStreamer) {
                    sseStreamer.streamTokenEvent(chatId, finalResponse)
                }
            }

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
                isWaitingForHumanInput,
                fileAnnotations,
                isStructuredOutput
            )

            // End analytics tracking
            if (analyticHandlers && llmIds) {
                await analyticHandlers.onLLMEnd(llmIds, finalResponse)
            }

            // Send additional streaming events if needed
            if (isStreamable) {
                this.sendStreamingEvents(options, chatId, response)
            }

            // Stream file annotations if any were extracted
            if (fileAnnotations.length > 0 && isLastNode && sseStreamer) {
                sseStreamer.streamFileAnnotationsEvent(chatId, fileAnnotations)
            }

            // Process template variables in state
            const outputForStateProcessing =
                isStructuredOutput && typeof response === 'object' ? JSON.stringify(response, null, 2) : finalResponse
            newState = processTemplateVariables(newState, outputForStateProcessing)

            /**
             * Remove the temporarily added image artifact messages before storing
             * This is to avoid storing the actual base64 data into database
             */
            const messagesToStore = messages.filter((msg: any) => !msg._isTemporaryImageMessage)

            // Replace the actual messages array with one that includes the file references for images instead of base64 data
            const messagesWithFileReferences = replaceBase64ImagesWithFileReferences(
                messagesToStore,
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
                    if (!enableMemory) {
                        if (!agentMessages.some((msg) => msg.role === 'user')) {
                            inputMessages.push({ role: 'user', content: input })
                        } else {
                            agentMessages.map((msg) => {
                                if (msg.role === 'user') {
                                    inputMessages.push({ role: 'user', content: msg.content })
                                }
                            })
                        }
                    } else {
                        inputMessages.push({ role: 'user', content: input })
                    }
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
                        name: nodeData?.label ? nodeData?.label.toLowerCase().replace(/\s/g, '_').trim() : nodeData?.id,
                        ...(((artifacts && artifacts.length > 0) ||
                            (fileAnnotations && fileAnnotations.length > 0) ||
                            (usedTools && usedTools.length > 0)) && {
                            additional_kwargs: {
                                ...(artifacts && artifacts.length > 0 && { artifacts }),
                                ...(fileAnnotations && fileAnnotations.length > 0 && { fileAnnotations }),
                                ...(usedTools && usedTools.length > 0 && { usedTools })
                            }
                        })
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
     * Extracts built-in used tools from response metadata and processes image generation results
     */
    private async extractBuiltInUsedTools(response: AIMessageChunk, builtInUsedTools: IUsedTool[] = []): Promise<IUsedTool[]> {
        if (!response.response_metadata) {
            return builtInUsedTools
        }

        const { output, tools, groundingMetadata, urlContextMetadata } = response.response_metadata

        // Handle OpenAI built-in tools
        if (output && Array.isArray(output) && output.length > 0 && tools && Array.isArray(tools) && tools.length > 0) {
            for (const outputItem of output) {
                if (outputItem.type && outputItem.type.endsWith('_call')) {
                    let toolInput = outputItem.action ?? outputItem.code
                    let toolOutput = outputItem.status === 'completed' ? 'Success' : outputItem.status

                    // Handle image generation calls specially
                    if (outputItem.type === 'image_generation_call') {
                        // Create input summary for image generation
                        toolInput = {
                            prompt: outputItem.revised_prompt || 'Image generation request',
                            size: outputItem.size || '1024x1024',
                            quality: outputItem.quality || 'standard',
                            output_format: outputItem.output_format || 'png'
                        }

                        // Check if image has been processed (base64 replaced with file path)
                        if (outputItem.result && !outputItem.result.startsWith('data:') && !outputItem.result.includes('base64')) {
                            toolOutput = `Image generated and saved`
                        } else {
                            toolOutput = `Image generated (base64)`
                        }
                    }

                    // Remove "_call" suffix to get the base tool name
                    const baseToolName = outputItem.type.replace('_call', '')

                    // Find matching tool that includes the base name in its type
                    const matchingTool = tools.find((tool) => tool.type && tool.type.includes(baseToolName))

                    if (matchingTool) {
                        // Check for duplicates
                        if (builtInUsedTools.find((tool) => tool.tool === matchingTool.type)) {
                            continue
                        }

                        builtInUsedTools.push({
                            tool: matchingTool.type,
                            toolInput,
                            toolOutput
                        })
                    }
                }
            }
        }

        // Handle Gemini googleSearch tool
        if (groundingMetadata && groundingMetadata.webSearchQueries && Array.isArray(groundingMetadata.webSearchQueries)) {
            // Check for duplicates
            const isDuplicate = builtInUsedTools.find(
                (tool) =>
                    tool.tool === 'googleSearch' &&
                    JSON.stringify((tool.toolInput as any)?.queries) === JSON.stringify(groundingMetadata.webSearchQueries)
            )
            if (!isDuplicate) {
                builtInUsedTools.push({
                    tool: 'googleSearch',
                    toolInput: {
                        queries: groundingMetadata.webSearchQueries
                    },
                    toolOutput: `Searched for: ${groundingMetadata.webSearchQueries.join(', ')}`
                })
            }
        }

        // Handle Gemini urlContext tool
        if (urlContextMetadata && urlContextMetadata.urlMetadata && Array.isArray(urlContextMetadata.urlMetadata)) {
            // Check for duplicates
            const isDuplicate = builtInUsedTools.find(
                (tool) =>
                    tool.tool === 'urlContext' &&
                    JSON.stringify((tool.toolInput as any)?.urlMetadata) === JSON.stringify(urlContextMetadata.urlMetadata)
            )
            if (!isDuplicate) {
                builtInUsedTools.push({
                    tool: 'urlContext',
                    toolInput: {
                        urlMetadata: urlContextMetadata.urlMetadata
                    },
                    toolOutput: `Processed ${urlContextMetadata.urlMetadata.length} URL(s)`
                })
            }
        }

        // Handle Gemini codeExecution tool
        if (response.content && Array.isArray(response.content)) {
            for (let i = 0; i < response.content.length; i++) {
                const item = response.content[i]

                if (item.type === 'executableCode' && item.executableCode) {
                    const language = item.executableCode.language || 'PYTHON'
                    const code = item.executableCode.code || ''
                    let toolOutput = ''

                    // Check for duplicates
                    const isDuplicate = builtInUsedTools.find(
                        (tool) =>
                            tool.tool === 'codeExecution' &&
                            (tool.toolInput as any)?.language === language &&
                            (tool.toolInput as any)?.code === code
                    )
                    if (isDuplicate) {
                        continue
                    }

                    // Check the next item for the output
                    const nextItem = i + 1 < response.content.length ? response.content[i + 1] : null

                    if (nextItem) {
                        if (nextItem.type === 'codeExecutionResult' && nextItem.codeExecutionResult) {
                            const outcome = nextItem.codeExecutionResult.outcome
                            const output = nextItem.codeExecutionResult.output || ''
                            toolOutput = outcome === 'OUTCOME_OK' ? output : `Error: ${output}`
                        } else if (nextItem.type === 'inlineData') {
                            toolOutput = 'Generated image data'
                        }
                    }

                    builtInUsedTools.push({
                        tool: 'codeExecution',
                        toolInput: {
                            language,
                            code
                        },
                        toolOutput
                    })
                }
            }
        }

        return builtInUsedTools
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
        abortController: AbortController,
        isStructuredOutput: boolean = false
    ): Promise<AIMessageChunk> {
        let response = new AIMessageChunk('')

        try {
            for await (const chunk of await llmNodeInstance.stream(messages, { signal: abortController?.signal })) {
                if (sseStreamer && !isStructuredOutput) {
                    let content = ''

                    if (typeof chunk === 'string') {
                        content = chunk
                    } else if (Array.isArray(chunk.content) && chunk.content.length > 0) {
                        content = chunk.content
                            .map((item: any) => {
                                if ((item.text && !item.type) || (item.type === 'text' && item.text)) {
                                    return item.text
                                } else if (item.type === 'executableCode' && item.executableCode) {
                                    const language = item.executableCode.language?.toLowerCase() || 'python'
                                    return `\n\`\`\`${language}\n${item.executableCode.code}\n\`\`\`\n`
                                } else if (item.type === 'codeExecutionResult' && item.codeExecutionResult) {
                                    const outcome = item.codeExecutionResult.outcome || 'OUTCOME_OK'
                                    const output = item.codeExecutionResult.output || ''
                                    if (outcome === 'OUTCOME_OK' && output) {
                                        return `**Code Output:**\n\`\`\`\n${output}\n\`\`\`\n`
                                    } else if (outcome !== 'OUTCOME_OK') {
                                        return `**Code Execution Error:**\n\`\`\`\n${output}\n\`\`\`\n`
                                    }
                                }
                                return ''
                            })
                            .filter((text: string) => text)
                            .join('')
                    } else if (chunk.content) {
                        content = chunk.content.toString()
                    }
                    sseStreamer.streamTokenEvent(chatId, content)
                }

                const messageChunk = typeof chunk === 'string' ? new AIMessageChunk(chunk) : chunk
                response = response.concat(messageChunk)
            }
        } catch (error) {
            console.error('Error during streaming:', error)
            throw error
        }

        // Only convert to string if all content items are text (no inlineData or other special types)
        if (Array.isArray(response.content) && response.content.length > 0) {
            const hasNonTextContent = response.content.some(
                (item: any) => item.type === 'inlineData' || item.type === 'executableCode' || item.type === 'codeExecutionResult'
            )
            if (!hasNonTextContent) {
                const responseContents = response.content as MessageContentText[]
                response.content = responseContents.map((item) => item.text).join('')
            }
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
        isWaitingForHumanInput: boolean = false,
        fileAnnotations: any[] = [],
        isStructuredOutput: boolean = false
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

        if (response.response_metadata) {
            output.responseMetadata = response.response_metadata
        }

        if (isStructuredOutput && typeof response === 'object') {
            const structuredOutput = response as Record<string, any>
            for (const key in structuredOutput) {
                if (structuredOutput[key] !== undefined && structuredOutput[key] !== null) {
                    output[key] = structuredOutput[key]
                }
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

        if (fileAnnotations && fileAnnotations.length > 0) {
            output.fileAnnotations = fileAnnotations
        }

        return output
    }

    /**
     * Sends additional streaming events for tool calls and metadata
     */
    private sendStreamingEvents(options: ICommonObject, chatId: string, response: AIMessageChunk): void {
        const sseStreamer: IServerSideEventStreamer = options.sseStreamer as IServerSideEventStreamer

        if (response.tool_calls) {
            const formattedToolCalls = response.tool_calls.map((toolCall: any) => ({
                tool: toolCall.name || 'tool',
                toolInput: toolCall.args,
                toolOutput: ''
            }))
            sseStreamer.streamCalledToolsEvent(chatId, flatten(formattedToolCalls))
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
        iterationContext,
        isStructuredOutput = false
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
        isStructuredOutput?: boolean
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
        const usedTools: IUsedTool[] = []
        let sourceDocuments: Array<any> = []
        let artifacts: any[] = []
        let isWaitingForHumanInput: boolean | undefined

        if (!response.tool_calls || response.tool_calls.length === 0) {
            return { response, usedTools: [], sourceDocuments: [], artifacts: [], totalTokens }
        }

        // Stream tool calls if available
        if (sseStreamer) {
            const formattedToolCalls = response.tool_calls.map((toolCall: any) => ({
                tool: toolCall.name || 'tool',
                toolInput: toolCall.args,
                toolOutput: ''
            }))
            sseStreamer.streamCalledToolsEvent(chatId, flatten(formattedToolCalls))
        }

        // Remove tool calls with no id
        const toBeRemovedToolCalls = []
        for (let i = 0; i < response.tool_calls.length; i++) {
            const toolCall = response.tool_calls[i]
            if (!toolCall.id) {
                toBeRemovedToolCalls.push(toolCall)
                usedTools.push({
                    tool: toolCall.name || 'tool',
                    toolInput: toolCall.args,
                    toolOutput: response.content
                })
            }
        }

        for (const toolCall of toBeRemovedToolCalls) {
            response.tool_calls.splice(response.tool_calls.indexOf(toolCall), 1)
        }

        // Add LLM response with tool calls to messages
        messages.push({
            id: response.id,
            role: 'assistant',
            content: response.content,
            tool_calls: response.tool_calls,
            usage_metadata: response.usage_metadata
        })

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
                    chatflowId: options.chatflowid,
                    sessionId: options.sessionId,
                    chatId: options.chatId,
                    input: input,
                    state: options.agentflowRuntime?.state
                }

                if (isToolRequireHumanInput) {
                    const toolCallDetails = '```json\n' + JSON.stringify(toolCall, null, 2) + '\n```'
                    const responseContent = response.content + `\nAttempting to use tool:\n${toolCallDetails}`
                    response.content = responseContent
                    if (!isStructuredOutput) {
                        sseStreamer?.streamTokenEvent(chatId, responseContent)
                    }
                    return { response, usedTools, sourceDocuments, artifacts, totalTokens, isWaitingForHumanInput: true }
                }

                let toolIds: ICommonObject | undefined
                if (options.analyticHandlers) {
                    toolIds = await options.analyticHandlers.onToolStart(toolCall.name, toolCall.args, options.parentTraceIds)
                }

                try {
                    //@ts-ignore
                    let toolOutput = await selectedTool.call(toolCall.args, { signal: abortController?.signal }, undefined, flowConfig)

                    if (options.analyticHandlers && toolIds) {
                        await options.analyticHandlers.onToolEnd(toolIds, toolOutput)
                    }

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

                    let toolInput
                    if (typeof toolOutput === 'string' && toolOutput.includes(TOOL_ARGS_PREFIX)) {
                        const [output, args] = toolOutput.split(TOOL_ARGS_PREFIX)
                        toolOutput = output
                        try {
                            toolInput = JSON.parse(args)
                        } catch (e) {
                            console.error('Error parsing tool input from tool:', e)
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
                        toolInput: toolInput ?? toolCall.args,
                        toolOutput
                    })
                } catch (e) {
                    if (options.analyticHandlers && toolIds) {
                        await options.analyticHandlers.onToolEnd(toolIds, e)
                    }

                    console.error('Error invoking tool:', e)
                    const errMsg = getErrorMessage(e)
                    let toolInput = toolCall.args
                    if (typeof errMsg === 'string' && errMsg.includes(TOOL_ARGS_PREFIX)) {
                        const [_, args] = errMsg.split(TOOL_ARGS_PREFIX)
                        try {
                            toolInput = JSON.parse(args)
                        } catch (e) {
                            console.error('Error parsing tool input from tool:', e)
                        }
                    }

                    usedTools.push({
                        tool: selectedTool.name,
                        toolInput,
                        toolOutput: '',
                        error: getErrorMessage(e)
                    })
                    sseStreamer?.streamUsedToolsEvent(chatId, flatten(usedTools))
                    throw new Error(getErrorMessage(e))
                }
            }
        }

        // Return direct tool output if there's exactly one tool with returnDirect
        if (response.tool_calls.length === 1) {
            const selectedTool = toolsInstance.find((tool) => tool.name === response.tool_calls?.[0]?.name)
            if (selectedTool && selectedTool.returnDirect) {
                const lastToolOutput = usedTools[0]?.toolOutput || ''
                const lastToolOutputString = typeof lastToolOutput === 'string' ? lastToolOutput : JSON.stringify(lastToolOutput, null, 2)

                if (sseStreamer && !isStructuredOutput) {
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

        if (response.tool_calls.length === 0) {
            const responseContent = typeof response.content === 'string' ? response.content : JSON.stringify(response.content, null, 2)
            return {
                response: new AIMessageChunk(responseContent),
                usedTools,
                sourceDocuments,
                artifacts,
                totalTokens
            }
        }

        // Get LLM response after tool calls
        let newResponse: AIMessageChunk

        if (isStreamable) {
            newResponse = await this.handleStreamingResponse(
                sseStreamer,
                llmNodeInstance,
                messages,
                chatId,
                abortController,
                isStructuredOutput
            )
        } else {
            newResponse = await llmNodeInstance.invoke(messages, { signal: abortController?.signal })

            // Stream non-streaming response if this is the last node
            if (isLastNode && sseStreamer && !isStructuredOutput) {
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
                iterationContext,
                isStructuredOutput
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
        iterationContext,
        isStructuredOutput = false
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
        isStructuredOutput?: boolean
    }): Promise<{
        response: AIMessageChunk
        usedTools: IUsedTool[]
        sourceDocuments: Array<any>
        artifacts: any[]
        totalTokens: number
        isWaitingForHumanInput?: boolean
    }> {
        let llmNodeInstance = llmWithoutToolsBind
        const usedTools: IUsedTool[] = []
        let sourceDocuments: Array<any> = []
        let artifacts: any[] = []
        let isWaitingForHumanInput: boolean | undefined

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
            const formattedToolCalls = response.tool_calls.map((toolCall: any) => ({
                tool: toolCall.name || 'tool',
                toolInput: toolCall.args,
                toolOutput: ''
            }))
            sseStreamer.streamCalledToolsEvent(chatId, flatten(formattedToolCalls))
        }

        // Remove tool calls with no id
        const toBeRemovedToolCalls = []
        for (let i = 0; i < response.tool_calls.length; i++) {
            const toolCall = response.tool_calls[i]
            if (!toolCall.id) {
                toBeRemovedToolCalls.push(toolCall)
                usedTools.push({
                    tool: toolCall.name || 'tool',
                    toolInput: toolCall.args,
                    toolOutput: response.content
                })
            }
        }

        for (const toolCall of toBeRemovedToolCalls) {
            response.tool_calls.splice(response.tool_calls.indexOf(toolCall), 1)
        }

        // Add LLM response with tool calls to messages
        messages.push({
            id: response.id,
            role: 'assistant',
            content: response.content,
            tool_calls: response.tool_calls,
            usage_metadata: response.usage_metadata
        })

        // Process each tool call
        for (let i = 0; i < response.tool_calls.length; i++) {
            const toolCall = response.tool_calls[i]

            const selectedTool = toolsInstance.find((tool) => tool.name === toolCall.name)
            if (selectedTool) {
                let parsedDocs
                let parsedArtifacts

                const flowConfig = {
                    chatflowId: options.chatflowid,
                    sessionId: options.sessionId,
                    chatId: options.chatId,
                    input: input,
                    state: options.agentflowRuntime?.state
                }

                if (humanInput.type === 'reject') {
                    messages.pop()
                    const toBeRemovedTool = toolsInstance.find((tool) => tool.name === toolCall.name)
                    if (toBeRemovedTool) {
                        toolsInstance = toolsInstance.filter((tool) => tool.name !== toolCall.name)
                        // Remove other tools with the same agentSelectedTool such as MCP tools
                        toolsInstance = toolsInstance.filter(
                            (tool) => (tool as any).agentSelectedTool !== (toBeRemovedTool as any).agentSelectedTool
                        )
                    }
                }
                if (humanInput.type === 'proceed') {
                    let toolIds: ICommonObject | undefined
                    if (options.analyticHandlers) {
                        toolIds = await options.analyticHandlers.onToolStart(toolCall.name, toolCall.args, options.parentTraceIds)
                    }

                    try {
                        //@ts-ignore
                        let toolOutput = await selectedTool.call(toolCall.args, { signal: abortController?.signal }, undefined, flowConfig)

                        if (options.analyticHandlers && toolIds) {
                            await options.analyticHandlers.onToolEnd(toolIds, toolOutput)
                        }

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

                        let toolInput
                        if (typeof toolOutput === 'string' && toolOutput.includes(TOOL_ARGS_PREFIX)) {
                            const [output, args] = toolOutput.split(TOOL_ARGS_PREFIX)
                            toolOutput = output
                            try {
                                toolInput = JSON.parse(args)
                            } catch (e) {
                                console.error('Error parsing tool input from tool:', e)
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
                            toolInput: toolInput ?? toolCall.args,
                            toolOutput
                        })
                    } catch (e) {
                        if (options.analyticHandlers && toolIds) {
                            await options.analyticHandlers.onToolEnd(toolIds, e)
                        }

                        console.error('Error invoking tool:', e)
                        const errMsg = getErrorMessage(e)
                        let toolInput = toolCall.args
                        if (typeof errMsg === 'string' && errMsg.includes(TOOL_ARGS_PREFIX)) {
                            const [_, args] = errMsg.split(TOOL_ARGS_PREFIX)
                            try {
                                toolInput = JSON.parse(args)
                            } catch (e) {
                                console.error('Error parsing tool input from tool:', e)
                            }
                        }

                        usedTools.push({
                            tool: selectedTool.name,
                            toolInput,
                            toolOutput: '',
                            error: getErrorMessage(e)
                        })
                        sseStreamer?.streamUsedToolsEvent(chatId, flatten(usedTools))
                        throw new Error(getErrorMessage(e))
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

                if (sseStreamer && !isStructuredOutput) {
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

        if (llmNodeInstance && (llmNodeInstance as any).builtInTools && (llmNodeInstance as any).builtInTools.length > 0) {
            toolsInstance.push(...(llmNodeInstance as any).builtInTools)
        }

        if (llmNodeInstance && toolsInstance.length > 0) {
            if (llmNodeInstance.bindTools === undefined) {
                throw new Error(`Agent needs to have a function calling capable models.`)
            }

            // @ts-ignore
            llmNodeInstance = llmNodeInstance.bindTools(toolsInstance)
        }

        if (isStreamable) {
            newResponse = await this.handleStreamingResponse(
                sseStreamer,
                llmNodeInstance,
                messages,
                chatId,
                abortController,
                isStructuredOutput
            )
        } else {
            newResponse = await llmNodeInstance.invoke(messages, { signal: abortController?.signal })

            // Stream non-streaming response if this is the last node
            if (isLastNode && sseStreamer && !isStructuredOutput) {
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
                iterationContext,
                isStructuredOutput
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

    /**
     * Processes sandbox links in the response text and converts them to file annotations
     */
    private async processSandboxLinks(text: string, baseURL: string, chatflowId: string, chatId: string): Promise<string> {
        let processedResponse = text

        // Regex to match sandbox links: [text](sandbox:/path/to/file)
        const sandboxLinkRegex = /\[([^\]]+)\]\(sandbox:\/([^)]+)\)/g
        const matches = Array.from(text.matchAll(sandboxLinkRegex))

        for (const match of matches) {
            const fullMatch = match[0]
            const linkText = match[1]
            const filePath = match[2]

            try {
                // Extract filename from the file path
                const fileName = filePath.split('/').pop() || filePath

                // Replace sandbox link with proper download URL
                const downloadUrl = `${baseURL}/api/v1/get-upload-file?chatflowId=${chatflowId}&chatId=${chatId}&fileName=${fileName}&download=true`
                const newLink = `[${linkText}](${downloadUrl})`

                processedResponse = processedResponse.replace(fullMatch, newLink)
            } catch (error) {
                console.error('Error processing sandbox link:', error)
                // If there's an error, remove the sandbox link as fallback
                processedResponse = processedResponse.replace(fullMatch, linkText)
            }
        }

        return processedResponse
    }
}

module.exports = { nodeClass: Agent_Agentflow }
