import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { ICommonObject, IMessage, INode, INodeData, INodeOptionsValue, INodeParams, IServerSideEventStreamer } from '../../../src/Interface'
import { AIMessageChunk, BaseMessageLike, MessageContentText } from '@langchain/core/messages'
import { DEFAULT_SUMMARIZER_TEMPLATE } from '../prompt'
import { AnalyticHandler } from '../../../src/handler'
import { ILLMMessage } from '../Interface.Agentflow'
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
import { processTemplateVariables, configureStructuredOutput } from '../../../src/utils'
import { flatten } from 'lodash'

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
        this.version = 1.1
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
                label: 'Input Message',
                name: 'llmUserMessage',
                type: 'string',
                description: 'Add an input message as user message at the end of the conversation',
                rows: 4,
                optional: true,
                acceptVariable: true,
                show: {
                    llmEnableMemory: true
                }
            },
            {
                label: 'Return Response As',
                name: 'llmReturnResponseAs',
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
                            'llmStructuredOutput[$index].type': 'enum'
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
                            'llmStructuredOutput[$index].type': 'jsonArray'
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
            let llmNodeInstance = (await newLLMNodeInstance.init(newNodeData, '', options)) as BaseChatModel

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

            for (const msg of llmMessages) {
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
                 * - Add user message if it does not exist in the llmMessages array
                 */
                if (options.uploads) {
                    const imageContents = await getUniqueImageMessages(options, messages, modelConfig)
                    if (imageContents) {
                        const { imageMessageWithBase64, imageMessageWithFileRef } = imageContents
                        messages.push(imageMessageWithBase64)
                        runtimeImageMessagesWithFileRef.push(imageMessageWithFileRef)
                    }
                }

                if (input && typeof input === 'string' && !llmMessages.some((msg) => msg.role === 'user')) {
                    messages.push({
                        role: 'user',
                        content: input
                    })
                }
            }
            delete nodeData.inputs?.llmMessages

            /**
             * Add image artifacts from previous assistant responses as user messages
             * Images are converted from FILE-STORAGE::<image_path> to base 64 image_url format
             */
            await addImageArtifactsToMessages(messages, options)

            // Configure structured output if specified
            const isStructuredOutput = _llmStructuredOutput && Array.isArray(_llmStructuredOutput) && _llmStructuredOutput.length > 0
            if (isStructuredOutput) {
                llmNodeInstance = configureStructuredOutput(llmNodeInstance, _llmStructuredOutput)
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
            const sseStreamer: IServerSideEventStreamer | undefined = options.sseStreamer

            /*
             * Invoke LLM
             */
            if (isStreamable) {
                response = await this.handleStreamingResponse(sseStreamer, llmNodeInstance, messages, chatId, abortController)
            } else {
                response = await llmNodeInstance.invoke(messages, { signal: abortController?.signal })

                // Stream whole response back to UI if this is the last node
                if (isLastNode && options.sseStreamer) {
                    const sseStreamer: IServerSideEventStreamer = options.sseStreamer as IServerSideEventStreamer
                    let finalResponse = ''
                    if (response.content && Array.isArray(response.content)) {
                        finalResponse = response.content.map((item: any) => item.text).join('\n')
                    } else if (response.content && typeof response.content === 'string') {
                        finalResponse = response.content
                    } else {
                        finalResponse = JSON.stringify(response, null, 2)
                    }
                    sseStreamer.streamTokenEvent(chatId, finalResponse)
                }
            }

            // Calculate execution time
            const endTime = Date.now()
            const timeDelta = endTime - startTime

            // Extract artifacts and file annotations from response metadata
            let artifacts: any[] = []
            let fileAnnotations: any[] = []
            if (response.response_metadata) {
                const {
                    artifacts: extractedArtifacts,
                    fileAnnotations: extractedFileAnnotations,
                    savedInlineImages
                } = await extractArtifactsFromResponse(response.response_metadata, newNodeData, options)

                if (extractedArtifacts.length > 0) {
                    artifacts = extractedArtifacts

                    // Stream artifacts if this is the last node
                    if (isLastNode && sseStreamer) {
                        sseStreamer.streamArtifactsEvent(chatId, artifacts)
                    }
                }

                if (extractedFileAnnotations.length > 0) {
                    fileAnnotations = extractedFileAnnotations

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
            let finalResponse = ''
            if (response.content && Array.isArray(response.content)) {
                finalResponse = response.content.map((item: any) => item.text).join('\n')
            } else if (response.content && typeof response.content === 'string') {
                finalResponse = response.content
            } else if (response.content === '') {
                // Empty response content, this could happen when there is only image data
                finalResponse = ''
            } else {
                finalResponse = JSON.stringify(response, null, 2)
            }
            const output = this.prepareOutputObject(
                response,
                finalResponse,
                startTime,
                endTime,
                timeDelta,
                isStructuredOutput,
                artifacts,
                fileAnnotations
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
            newState = processTemplateVariables(newState, finalResponse)

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
                        if (!llmMessages.some((msg) => msg.role === 'user')) {
                            inputMessages.push({ role: 'user', content: input })
                        } else {
                            llmMessages.map((msg) => {
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

            const returnResponseAs = nodeData.inputs?.llmReturnResponseAs as string
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

                    // LLM response
                    {
                        role: returnRole,
                        content: finalResponse,
                        name: nodeData?.label ? nodeData?.label.toLowerCase().replace(/\s/g, '_').trim() : nodeData?.id,
                        ...(((artifacts && artifacts.length > 0) || (fileAnnotations && fileAnnotations.length > 0)) && {
                            additional_kwargs: {
                                ...(artifacts && artifacts.length > 0 && { artifacts }),
                                ...(fileAnnotations && fileAnnotations.length > 0 && { fileAnnotations })
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

                    if (typeof chunk === 'string') {
                        content = chunk
                    } else if (Array.isArray(chunk.content) && chunk.content.length > 0) {
                        const contents = chunk.content as MessageContentText[]
                        content = contents.map((item) => item.text).join('')
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
        finalResponse: string,
        startTime: number,
        endTime: number,
        timeDelta: number,
        isStructuredOutput: boolean,
        artifacts: any[] = [],
        fileAnnotations: any[] = []
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

        if (artifacts && artifacts.length > 0) {
            output.artifacts = flatten(artifacts)
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
}

module.exports = { nodeClass: LLM_Agentflow }
