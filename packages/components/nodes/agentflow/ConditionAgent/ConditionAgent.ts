import { AnalyticHandler } from '../../../src/handler'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { AIMessageChunk, BaseMessageLike } from '@langchain/core/messages'
import {
    getPastChatHistoryImageMessages,
    getUniqueImageMessages,
    processMessagesWithImages,
    replaceBase64ImagesWithFileReferences
} from '../utils'
import { CONDITION_AGENT_SYSTEM_PROMPT, DEFAULT_SUMMARIZER_TEMPLATE } from '../prompt'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'

class ConditionAgent_Agentflow implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    color: string
    tags: string[]
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Condition Agent'
        this.name = 'conditionAgentAgentflow'
        this.version = 1.1
        this.type = 'ConditionAgent'
        this.category = 'Agent Flows'
        this.description = `Utilize an agent to split flows based on dynamic conditions`
        this.baseClasses = [this.type]
        this.color = '#ff8fab'
        this.inputs = [
            {
                label: 'Model',
                name: 'conditionAgentModel',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                loadConfig: true
            },
            {
                label: 'Instructions',
                name: 'conditionAgentInstructions',
                type: 'string',
                description: 'A general instructions of what the condition agent should do',
                rows: 4,
                acceptVariable: true,
                placeholder: 'Determine if the user is interested in learning about AI'
            },
            {
                label: 'Input',
                name: 'conditionAgentInput',
                type: 'string',
                description: 'Input to be used for the condition agent',
                rows: 4,
                acceptVariable: true,
                default: '<p><span class="variable" data-type="mention" data-id="question" data-label="question">{{ question }}</span> </p>'
            },
            {
                label: 'Scenarios',
                name: 'conditionAgentScenarios',
                description: 'Define the scenarios that will be used as the conditions to split the flow',
                type: 'array',
                array: [
                    {
                        label: 'Scenario',
                        name: 'scenario',
                        type: 'string',
                        placeholder: 'User is asking for a pizza'
                    }
                ],
                default: [
                    {
                        scenario: ''
                    },
                    {
                        scenario: ''
                    }
                ]
            },
            {
                label: 'Override System Prompt',
                name: 'conditionAgentOverrideSystemPrompt',
                type: 'boolean',
                description: 'Override initial system prompt for Condition Agent',
                optional: true
            },
            {
                label: 'Node System Prompt',
                name: 'conditionAgentSystemPrompt',
                type: 'string',
                rows: 4,
                optional: true,
                acceptVariable: true,
                default: CONDITION_AGENT_SYSTEM_PROMPT,
                description: 'Expert use only. Modifying this can significantly alter agent behavior. Leave default if unsure',
                show: {
                    conditionAgentOverrideSystemPrompt: true
                }
            }
            /*{
                label: 'Enable Memory',
                name: 'conditionAgentEnableMemory',
                type: 'boolean',
                description: 'Enable memory for the conversation thread',
                default: true,
                optional: true
            },
            {
                label: 'Memory Type',
                name: 'conditionAgentMemoryType',
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
                    conditionAgentEnableMemory: true
                }
            },
            {
                label: 'Window Size',
                name: 'conditionAgentMemoryWindowSize',
                type: 'number',
                default: '20',
                description: 'Uses a fixed window size to surface the last N messages',
                show: {
                    conditionAgentMemoryType: 'windowSize'
                }
            },
            {
                label: 'Max Token Limit',
                name: 'conditionAgentMemoryMaxTokenLimit',
                type: 'number',
                default: '2000',
                description: 'Summarize conversations once token limit is reached. Default to 2000',
                show: {
                    conditionAgentMemoryType: 'conversationSummaryBuffer'
                }
            }*/
        ]
        this.outputs = [
            {
                label: '0',
                name: '0',
                description: 'Condition 0'
            },
            {
                label: '1',
                name: '1',
                description: 'Else'
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
        }
    }

    private parseJsonMarkdown(jsonString: string): any {
        // Strip whitespace
        jsonString = jsonString.trim()
        const starts = ['```json', '```', '``', '`', '{']
        const ends = ['```', '``', '`', '}']

        let startIndex = -1
        let endIndex = -1

        // Find start of JSON
        for (const s of starts) {
            startIndex = jsonString.indexOf(s)
            if (startIndex !== -1) {
                if (jsonString[startIndex] !== '{') {
                    startIndex += s.length
                }
                break
            }
        }

        // Find end of JSON
        if (startIndex !== -1) {
            for (const e of ends) {
                endIndex = jsonString.lastIndexOf(e, jsonString.length)
                if (endIndex !== -1) {
                    if (jsonString[endIndex] === '}') {
                        endIndex += 1
                    }
                    break
                }
            }
        }

        if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
            const extractedContent = jsonString.slice(startIndex, endIndex).trim()
            try {
                return JSON.parse(extractedContent)
            } catch (error) {
                throw new Error(`Invalid JSON object. Error: ${error}`)
            }
        }

        throw new Error('Could not find JSON block in the output.')
    }

    async run(nodeData: INodeData, question: string, options: ICommonObject): Promise<any> {
        let llmIds: ICommonObject | undefined
        let analyticHandlers = options.analyticHandlers as AnalyticHandler

        try {
            const abortController = options.abortController as AbortController

            // Extract input parameters
            const model = nodeData.inputs?.conditionAgentModel as string
            const modelConfig = nodeData.inputs?.conditionAgentModelConfig as ICommonObject
            if (!model) {
                throw new Error('Model is required')
            }
            const conditionAgentInput = nodeData.inputs?.conditionAgentInput as string
            let input = conditionAgentInput || question
            const conditionAgentInstructions = nodeData.inputs?.conditionAgentInstructions as string
            const conditionAgentSystemPrompt = nodeData.inputs?.conditionAgentSystemPrompt as string
            const conditionAgentOverrideSystemPrompt = nodeData.inputs?.conditionAgentOverrideSystemPrompt as boolean
            let systemPrompt = CONDITION_AGENT_SYSTEM_PROMPT
            if (conditionAgentSystemPrompt && conditionAgentOverrideSystemPrompt) {
                systemPrompt = conditionAgentSystemPrompt
            }

            // Extract memory and configuration options
            const enableMemory = nodeData.inputs?.conditionAgentEnableMemory as boolean
            const memoryType = nodeData.inputs?.conditionAgentMemoryType as string
            const _conditionAgentScenarios = nodeData.inputs?.conditionAgentScenarios as { scenario: string }[]

            // Extract runtime state and history
            const state = options.agentflowRuntime?.state as ICommonObject
            const pastChatHistory = (options.pastChatHistory as BaseMessageLike[]) ?? []
            const runtimeChatHistory = (options.agentflowRuntime?.chatHistory as BaseMessageLike[]) ?? []

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

            const isStructuredOutput =
                _conditionAgentScenarios && Array.isArray(_conditionAgentScenarios) && _conditionAgentScenarios.length > 0
            if (!isStructuredOutput) {
                throw new Error('Scenarios are required')
            }

            // Prepare messages array
            const messages: BaseMessageLike[] = [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: `{"input": "Hello", "scenarios": ["user is asking about AI", "user is not asking about AI"], "instruction": "Your task is to check if the user is asking about AI."}`
                },
                {
                    role: 'assistant',
                    content: `\`\`\`json\n{"output": "user is not asking about AI"}\n\`\`\``
                }
            ]
            // Use to store messages with image file references as we do not want to store the base64 data into database
            let runtimeImageMessagesWithFileRef: BaseMessageLike[] = []
            // Use to keep track of past messages with image file references
            let pastImageMessagesWithFileRef: BaseMessageLike[] = []

            input = `{"input": ${input}, "scenarios": ${JSON.stringify(
                _conditionAgentScenarios.map((scenario) => scenario.scenario)
            )}, "instruction": ${conditionAgentInstructions}}`

            // Handle memory management if enabled
            if (enableMemory) {
                await this.handleMemory({
                    messages,
                    memoryType,
                    pastChatHistory,
                    runtimeChatHistory,
                    llmNodeInstance,
                    nodeData,
                    input,
                    abortController,
                    options,
                    modelConfig,
                    runtimeImageMessagesWithFileRef,
                    pastImageMessagesWithFileRef
                })
            } else {
                /*
                 * If this is the first node:
                 * - Add images to messages if exist
                 */
                if (!runtimeChatHistory.length && options.uploads) {
                    const imageContents = await getUniqueImageMessages(options, messages, modelConfig)
                    if (imageContents) {
                        const { imageMessageWithBase64, imageMessageWithFileRef } = imageContents
                        messages.push(imageMessageWithBase64)
                        runtimeImageMessagesWithFileRef.push(imageMessageWithFileRef)
                    }
                }
                messages.push({
                    role: 'user',
                    content: input
                })
            }

            // Initialize response and determine if streaming is possible
            let response: AIMessageChunk = new AIMessageChunk('')

            // Start analytics
            if (analyticHandlers && options.parentTraceIds) {
                const llmLabel = options?.componentNodes?.[model]?.label || model
                llmIds = await analyticHandlers.onLLMStart(llmLabel, messages, options.parentTraceIds)
            }

            // Track execution time
            const startTime = Date.now()

            response = await llmNodeInstance.invoke(messages, { signal: abortController?.signal })

            // Calculate execution time
            const endTime = Date.now()
            const timeDelta = endTime - startTime

            // End analytics tracking
            if (analyticHandlers && llmIds) {
                await analyticHandlers.onLLMEnd(
                    llmIds,
                    typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
                )
            }

            let calledOutputName: string
            try {
                const parsedResponse = this.parseJsonMarkdown(response.content as string)
                if (!parsedResponse.output || typeof parsedResponse.output !== 'string') {
                    throw new Error('LLM response is missing the "output" key or it is not a string.')
                }
                calledOutputName = parsedResponse.output
            } catch (error) {
                throw new Error(
                    `Failed to parse a valid scenario from the LLM's response. Please check if the model is capable of following JSON output instructions. Raw LLM Response: "${
                        response.content as string
                    }"`
                )
            }

            // Clean up empty inputs
            for (const key in nodeData.inputs) {
                if (nodeData.inputs[key] === '') {
                    delete nodeData.inputs[key]
                }
            }

            // Find the first exact match
            const matchedScenarioIndex = _conditionAgentScenarios.findIndex(
                (scenario) => calledOutputName.toLowerCase() === scenario.scenario.toLowerCase()
            )

            const conditions = _conditionAgentScenarios.map((scenario, index) => {
                return {
                    output: scenario.scenario,
                    isFulfilled: index === matchedScenarioIndex
                }
            })

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
                    inputMessages.push({ role: 'user', content: question })
                }
            }

            const returnOutput = {
                id: nodeData.id,
                name: this.name,
                input: { messages: messagesWithFileReferences },
                output: {
                    conditions,
                    content: typeof response.content === 'string' ? response.content : JSON.stringify(response.content),
                    timeMetadata: {
                        start: startTime,
                        end: endTime,
                        delta: timeDelta
                    }
                },
                state,
                chatHistory: [...inputMessages]
            }

            return returnOutput
        } catch (error) {
            if (options.analyticHandlers && llmIds) {
                await options.analyticHandlers.onLLMError(llmIds, error instanceof Error ? error.message : String(error))
            }

            if (error instanceof Error && error.message === 'Aborted') {
                throw error
            }
            throw new Error(`Error in Condition Agent node: ${error instanceof Error ? error.message : String(error)}`)
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
        input: string
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
        if (!runtimeChatHistory.length) {
            /*
             * If this is the first node:
             * - Add images to messages if exist
             */
            if (options.uploads) {
                const imageContents = await getUniqueImageMessages(options, messages, modelConfig)
                if (imageContents) {
                    const { imageMessageWithBase64, imageMessageWithFileRef } = imageContents
                    pastMessages.push(imageMessageWithBase64)
                    runtimeImageMessagesWithFileRef.push(imageMessageWithFileRef)
                }
            }
        }
        const { updatedMessages, transformedMessages } = await processMessagesWithImages(pastMessages, options)
        pastMessages = updatedMessages
        pastImageMessagesWithFileRef.push(...transformedMessages)

        if (pastMessages.length > 0) {
            if (memoryType === 'windowSize') {
                // Window memory: Keep the last N messages
                const windowSize = nodeData.inputs?.conditionAgentMemoryWindowSize as number
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

        messages.push({
            role: 'user',
            content: input
        })
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
        const maxTokenLimit = (nodeData.inputs?.conditionAgentMemoryMaxTokenLimit as number) || 2000

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
}

module.exports = { nodeClass: ConditionAgent_Agentflow }
