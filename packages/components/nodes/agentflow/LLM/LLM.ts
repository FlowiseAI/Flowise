import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams, IServerSideEventStreamer } from '../../../src/Interface'
import { AIMessageChunk, BaseMessageLike } from '@langchain/core/messages'
import { DEFAULT_SUMMARIZER_TEMPLATE } from '../prompt'
import { z } from 'zod'
import { AnalyticHandler } from '../../../src/handler'
import { ILLMMessage, IStructuredOutput } from '../Interface.Agentflow'
import { getUniqueImageMessages, processMessagesWithImages, replaceBase64ImagesWithFileReferences, updateFlowState } from '../utils'

class LLM_Agentflow implements INode {
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
        this.label = 'LLM'
        this.name = 'llmAgentflow'
        this.version = 1.0
        this.type = 'LLM'
        this.category = 'Agent Flows'
        this.description = 'Large language models to analyze user-provided inputs and generate responses'
        this.color = '#64B5F6'
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Model',
                name: 'llmModel',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                loadConfig: true
            },
            {
                label: 'Messages',
                name: 'llmMessages',
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
                label: 'Enable Memory',
                name: 'llmEnableMemory',
                type: 'boolean',
                description: 'Enable memory for the conversation thread',
                default: true,
                optional: true
            },
            {
                label: 'Memory Type',
                name: 'llmMemoryType',
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
                    llmEnableMemory: true
                }
            },
            {
                label: 'Window Size',
                name: 'llmMemoryWindowSize',
                type: 'number',
                default: '20',
                description: 'Uses a fixed window size to surface the last N messages',
                show: {
                    llmMemoryType: 'windowSize'
                }
            },
            {
                label: 'Max Token Limit',
                name: 'llmMemoryMaxTokenLimit',
                type: 'number',
                default: '2000',
                description: 'Summarize conversations once token limit is reached. Default to 2000',
                show: {
                    llmMemoryType: 'conversationSummaryBuffer'
                }
            },
            {
                label: 'User Message',
                name: 'llmUserMessage',
                type: 'string',
                description: 'User message will be insert at the end of the messages',
                rows: 4,
                optional: true,
                acceptVariable: true,
                default:
                    '<p><span class="variable" data-type="mention" data-id="question" data-label="question">{{ question }}</span> </p>',
                show: {
                    llmEnableMemory: true
                }
            },
            {
                label: 'JSON Structured Output',
                name: 'llmStructuredOutput',
                description: 'Instruct the LLM to give output in a JSON structured schema',
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
                            }
                        ]
                    },
                    {
                        label: 'Enum Values',
                        name: 'enumValues',
                        type: 'string',
                        placeholder: 'value1, value2, value3',
                        description: 'Enum values. Separated by comma',
                        show: {
                            'llmStructuredOutput[$index].type': 'enum'
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
                name: 'llmUpdateState',
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
        async listRuntimeStateKeys(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const previousNodes = options.previousNodes as ICommonObject[]
            const startAgentflowNode = previousNodes.find((node) => node.name === 'startAgentflow')
            const state = startAgentflowNode?.inputs?.startState as ICommonObject[]
            return state.map((item) => ({ label: item.key, name: item.key }))
        }
    }

    async run(nodeData: INodeData, input: string | Record<string, any>, options: ICommonObject): Promise<any> {
        let llmIds: ICommonObject | undefined
        let analyticHandlers = options.analyticHandlers as AnalyticHandler

        try {
            const abortController = options.abortController as AbortController

            // Extract input parameters
            const model = nodeData.inputs?.llmModel as string
            const modelConfig = nodeData.inputs?.llmModelConfig as ICommonObject
            if (!model) {
                throw new Error('Model is required')
            }

            // Extract memory and configuration options
            const enableMemory = nodeData.inputs?.llmEnableMemory as boolean
            const memoryType = nodeData.inputs?.llmMemoryType as string
            const userMessage = nodeData.inputs?.llmUserMessage as string
            const _llmUpdateState = nodeData.inputs?.llmUpdateState
            const _llmStructuredOutput = nodeData.inputs?.llmStructuredOutput
            const llmMessages = (nodeData.inputs?.llmMessages as unknown as ILLMMessage[]) ?? []

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
            let llmNodeInstance = (await newLLMNodeInstance.init(newNodeData, '', options)) as BaseChatModel

            // Prepare messages array
            const messages: BaseMessageLike[] = []
            let uniqueImageMessages: BaseMessageLike[] = []
            let pastImageMessages: BaseMessageLike[] = []

            for (const msg of llmMessages) {
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
                    uniqueImageMessages,
                    pastImageMessages
                })
            } else if (input && typeof input === 'string') {
                // If memory is disabled, just add the current question
                // Add images to messages if exist
                if (options.uploads) {
                    const imageContents = await getUniqueImageMessages(options, messages, modelConfig)
                    if (imageContents) {
                        const { llmMessages, storeMessages } = imageContents
                        messages.push(llmMessages)
                        uniqueImageMessages.push(storeMessages)
                    }
                } else {
                    messages.push({
                        role: 'user',
                        content: input
                    })
                }
            }
            delete nodeData.inputs?.llmMessages

            // Configure structured output if specified
            const isStructuredOutput = _llmStructuredOutput && Array.isArray(_llmStructuredOutput) && _llmStructuredOutput.length > 0
            if (isStructuredOutput) {
                llmNodeInstance = this.configureStructuredOutput(llmNodeInstance, _llmStructuredOutput)
            }

            // Initialize response and determine if streaming is possible
            let response: AIMessageChunk = new AIMessageChunk('')
            const isLastNode = options.isLastNode as boolean
            const isStreamable = isLastNode && options.sseStreamer !== undefined && modelConfig?.streaming !== false && !isStructuredOutput

            // Start analytics
            if (analyticHandlers && options.parentTraceIds) {
                const llmLabel = options?.componentNodes?.[model]?.label || model
                llmIds = await analyticHandlers.onLLMStart(llmLabel, messages, options.parentTraceIds)
            }

            // Track execution time
            const startTime = Date.now()

            if (isStreamable) {
                response = await this.handleStreamingResponse(llmNodeInstance, messages, options, chatId, abortController)
            } else {
                response = await llmNodeInstance.invoke(messages, { signal: abortController?.signal })

                // Stream whole response back to UI if this is the last node
                if (isLastNode && options.sseStreamer) {
                    const sseStreamer: IServerSideEventStreamer = options.sseStreamer as IServerSideEventStreamer
                    sseStreamer.streamTokenEvent(chatId, JSON.stringify(response, null, 2))
                }
            }

            // Calculate execution time
            const endTime = Date.now()
            const timeDelta = endTime - startTime

            // Update flow state if needed
            let newState = { ...state }
            if (_llmUpdateState && Array.isArray(_llmUpdateState) && _llmUpdateState.length > 0) {
                newState = updateFlowState(state, _llmUpdateState)
            }

            // Clean up empty inputs
            for (const key in nodeData.inputs) {
                if (nodeData.inputs[key] === '') {
                    delete nodeData.inputs[key]
                }
            }

            // Prepare final response and output object
            const finalResponse = (response.content as string) ?? JSON.stringify(response, null, 2)
            const output = this.prepareOutputObject(response, finalResponse, startTime, endTime, timeDelta)

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

            // Final input
            let finalChatHistoryInput = ''
            if (input && typeof input === 'string') {
                finalChatHistoryInput = input
            } else if (userMessage) {
                finalChatHistoryInput = userMessage
            }

            // Replace the actual messages array with one that includes the file references for images instead of base64 data
            const messagesWithFileReferences = replaceBase64ImagesWithFileReferences(messages, uniqueImageMessages, pastImageMessages)

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
                    // Start with any new unique image messages
                    ...uniqueImageMessages,

                    // User input
                    ...(finalChatHistoryInput ? [{ role: 'user', content: finalChatHistoryInput }] : []),

                    // LLM response
                    { role: 'assistant', content: finalResponse }
                ]
            }
        } catch (error) {
            if (options.analyticHandlers && llmIds) {
                await options.analyticHandlers.onLLMError(llmIds, error instanceof Error ? error.message : String(error))
            }

            if (error instanceof Error && error.message === 'Aborted') {
                throw error
            }
            throw new Error(`Error in LLM node: ${error instanceof Error ? error.message : String(error)}`)
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
        uniqueImageMessages,
        pastImageMessages
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
        uniqueImageMessages: BaseMessageLike[]
        pastImageMessages: BaseMessageLike[]
    }): Promise<void> {
        let pastMessages = [...pastChatHistory, ...runtimeChatHistory]
        const { updatedMessages, transformedMessages } = await processMessagesWithImages(pastMessages, options)
        pastMessages = updatedMessages
        pastImageMessages.push(...transformedMessages)

        if (pastMessages.length > 0) {
            if (memoryType === 'windowSize') {
                // Window memory: Keep the last N messages
                const windowSize = nodeData.inputs?.llmMemoryWindowSize as number
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

        // Add images to messages
        if (options.uploads) {
            // Get unique image messages
            const imageContents = await getUniqueImageMessages(options, messages, modelConfig)
            if (imageContents) {
                const { llmMessages, storeMessages } = imageContents
                messages.push(llmMessages)
                uniqueImageMessages.push(storeMessages)
            }
        }

        // Add user message
        if (userMessage) {
            messages.push({
                role: 'user',
                content: userMessage
            })
        } else if (input && typeof input === 'string') {
            messages.push({
                role: 'user',
                content: input
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
        const maxTokenLimit = (nodeData.inputs?.llmMemoryMaxTokenLimit as number) || 2000

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
     * Configures structured output for the LLM
     */
    private configureStructuredOutput(llmNodeInstance: BaseChatModel, llmStructuredOutput: IStructuredOutput[]): BaseChatModel {
        try {
            const zodObj: ICommonObject = {}
            for (const sch of llmStructuredOutput) {
                if (sch.type === 'string') {
                    zodObj[sch.key] = z.string().describe(sch.description || '')
                } else if (sch.type === 'stringArray') {
                    zodObj[sch.key] = z.array(z.string()).describe(sch.description || '')
                } else if (sch.type === 'number') {
                    zodObj[sch.key] = z.number().describe(sch.description || '')
                } else if (sch.type === 'boolean') {
                    zodObj[sch.key] = z.boolean().describe(sch.description || '')
                } else if (sch.type === 'enum') {
                    const enumValues = sch.enumValues?.split(',').map((item: string) => item.trim()) || []
                    zodObj[sch.key] = z
                        .enum(enumValues.length ? (enumValues as [string, ...string[]]) : ['default'])
                        .describe(sch.description || '')
                }
            }
            const structuredOutput = z.object(zodObj)

            // @ts-ignore
            return llmNodeInstance.withStructuredOutput(structuredOutput)
        } catch (exception) {
            console.error(exception)
            return llmNodeInstance
        }
    }

    /**
     * Handles streaming response from the LLM
     */
    private async handleStreamingResponse(
        llmNodeInstance: BaseChatModel,
        messages: BaseMessageLike[],
        options: ICommonObject,
        chatId: string,
        abortController: AbortController
    ): Promise<AIMessageChunk> {
        const sseStreamer: IServerSideEventStreamer = options.sseStreamer as IServerSideEventStreamer
        let response = new AIMessageChunk('')

        for await (const chunk of await llmNodeInstance.stream(messages, { signal: abortController?.signal })) {
            sseStreamer.streamTokenEvent(chatId, chunk.content.toString())
            response = response.concat(chunk)
        }
        return response
    }

    /**
     * Prepares the output object with response and metadata
     */
    private prepareOutputObject(
        response: AIMessageChunk,
        finalResponse: string,
        startTime: number,
        endTime: number,
        timeDelta: number
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

        if (response.usage_metadata) {
            output.usageMetadata = response.usage_metadata
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
}

module.exports = { nodeClass: LLM_Agentflow }
