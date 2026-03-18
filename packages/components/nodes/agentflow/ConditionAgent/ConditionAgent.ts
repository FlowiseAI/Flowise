import { AnalyticHandler } from '../../../src/handler'
import { ICommonObject, IMessage, INode, INodeData, INodeOptionsValue, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { AIMessageChunk, BaseMessageLike } from '@langchain/core/messages'
import { getPastChatHistoryImageMessages, getUniqueImageMessages, processMessagesWithImages, revertBase64ImagesToFileRefs } from '../utils'
import { CONDITION_AGENT_SYSTEM_PROMPT, DEFAULT_SUMMARIZER_TEMPLATE } from '../prompt'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { findBestScenarioIndex } from './matchScenario'
import { extractResponseContent } from '../../../src/utils'
import { getModelConfigByModelName, MODEL_TYPE } from '../../../src/modelLoader'
import { NodeHtmlMarkdown } from 'node-html-markdown'

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
        this.version = 2.0
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
                minItems: 1,
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
            },
            {
                label: 'Override System Prompt',
                name: 'conditionAgentOverrideSystemPrompt',
                type: 'boolean',
                description: 'Override initial system prompt for Condition Agent',
                optional: true
            },
            {
                label: 'Condition Agent System Prompt',
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
            const modelName = modelConfig?.model ?? modelConfig?.modelName

            const conditionAgentInput = nodeData.inputs?.conditionAgentInput as string
            let input = conditionAgentInput || question
            const conditionAgentInstructions = nodeData.inputs?.conditionAgentInstructions as string
            const conditionAgentSystemPrompt = nodeData.inputs?.conditionAgentSystemPrompt as string
            const conditionAgentOverrideSystemPrompt = nodeData.inputs?.conditionAgentOverrideSystemPrompt as boolean
            let systemPrompt = NodeHtmlMarkdown.translate(CONDITION_AGENT_SYSTEM_PROMPT)
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
            const prependedChatHistory = options.prependedChatHistory as IMessage[]

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

            // Prepare prefix messages (system prompt + few-shot examples) - needed for model invocation only
            const prefixMessages: BaseMessageLike[] = [
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

            // Prepare messages array (these get stored in output)
            const messages: BaseMessageLike[] = []

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

            const scenariosList = _conditionAgentScenarios.map((scenario, index) => `${index + 1}. ${scenario.scenario}`).join('\n')
            const prettyInput = `### Input\n${input}\n\n### Scenarios\n${scenariosList}\n\n### Instruction\n${conditionAgentInstructions}`

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
                    modelConfig
                })
            } else {
                /*
                 * If this is the first node:
                 * - Add images to messages if exist
                 */
                if (!runtimeChatHistory.length && options.uploads) {
                    const imageContents = await getUniqueImageMessages(options, messages, modelConfig)
                    if (imageContents) {
                        messages.push(imageContents.imageMessageWithBase64)
                    }
                }
                messages.push({
                    role: 'user',
                    content: input
                })
            }

            // Initialize response and determine if streaming is possible
            let response: AIMessageChunk = new AIMessageChunk('')

            // Combine prefix messages with regular messages for model invocation
            const allMessages = [...prefixMessages, ...messages]

            // Start analytics
            if (analyticHandlers && options.parentTraceIds) {
                const llmLabel = options?.componentNodes?.[model]?.label || model
                llmIds = await analyticHandlers.onLLMStart(llmLabel, allMessages, options.parentTraceIds)
            }

            // Track execution time
            const startTime = Date.now()

            response = await llmNodeInstance.invoke(allMessages, { signal: abortController?.signal })

            // Calculate execution time
            const endTime = Date.now()
            const timeDelta = endTime - startTime

            // End analytics tracking (pass structured output with usage metadata)
            if (analyticHandlers && llmIds) {
                const analyticsOutput: any = {
                    content: extractResponseContent(response)
                }
                // Include usage metadata if available
                if (response.usage_metadata) {
                    analyticsOutput.usageMetadata = response.usage_metadata
                }
                // Include response metadata (contains model name) if available
                if (response.response_metadata) {
                    analyticsOutput.responseMetadata = response.response_metadata
                }
                await analyticHandlers.onLLMEnd(llmIds, analyticsOutput, { model: modelName, provider: model })
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

            const matchedScenarioIndex = findBestScenarioIndex(_conditionAgentScenarios, calledOutputName)

            const conditions = _conditionAgentScenarios.map((scenario, index) => {
                return {
                    output: scenario.scenario,
                    isFulfilled: index === matchedScenarioIndex
                }
            })

            // Revert all tagged base64 image_url items back to stored-file format
            const messagesWithFileReferences = revertBase64ImagesToFileRefs(messages)

            // Replace the user input with prettified input for display purposes
            for (let i = messagesWithFileReferences.length - 1; i >= 0; i--) {
                const msg = messagesWithFileReferences[i] as any
                if (msg.role === 'user' && msg.content === input) {
                    msg.content = prettyInput
                    break
                }
            }

            // Only add to runtime chat history if this is the first node
            const inputMessages = []
            if (!runtimeChatHistory.length) {
                const imageInputMessages = messagesWithFileReferences.filter(
                    (msg: any) =>
                        msg.role === 'user' &&
                        Array.isArray(msg.content) &&
                        msg.content.some((item: any) => item.type === 'stored-file' && item.mime?.startsWith('image/'))
                )
                if (imageInputMessages.length) {
                    inputMessages.push(...imageInputMessages)
                }
                if (input && typeof input === 'string') {
                    inputMessages.push({ role: 'user', content: question })
                }
            }

            const costMetadata = await this.calculateUsageCost(model, modelConfig?.modelName as string | undefined, response.usage_metadata)

            const output: any = {
                conditions,
                content: extractResponseContent(response),
                timeMetadata: {
                    start: startTime,
                    end: endTime,
                    delta: timeDelta
                }
            }

            if (response.usage_metadata) {
                output.usageMetadata = { ...response.usage_metadata }
            }

            if (costMetadata && output.usageMetadata) {
                output.usageMetadata.input_cost = costMetadata.input_cost
                output.usageMetadata.output_cost = costMetadata.output_cost
                output.usageMetadata.total_cost = costMetadata.total_cost
                output.usageMetadata.base_input_cost = costMetadata.base_input_cost
                output.usageMetadata.base_output_cost = costMetadata.base_output_cost
            }

            if (response.response_metadata) {
                output.responseMetadata = response.response_metadata
            }

            const returnOutput = {
                id: nodeData.id,
                name: this.name,
                input: { messages: messagesWithFileReferences },
                output,
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
        modelConfig
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
    }): Promise<void> {
        const { updatedPastMessages } = await getPastChatHistoryImageMessages(pastChatHistory, options)
        pastChatHistory = updatedPastMessages

        let pastMessages = [...pastChatHistory, ...runtimeChatHistory]
        if (!runtimeChatHistory.length) {
            /*
             * If this is the first node:
             * - Add images to messages if exist
             */
            if (options.uploads) {
                const imageContents = await getUniqueImageMessages(options, messages, modelConfig)
                if (imageContents) {
                    pastMessages.push(imageContents.imageMessageWithBase64)
                }
            }
        }
        const { updatedMessages } = await processMessagesWithImages(pastMessages, options)
        pastMessages = updatedMessages

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
                messages.push({ role: 'assistant', content: extractResponseContent(summary) })
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
            let summaryRole = 'system'
            if (messages.some((msg) => typeof msg === 'object' && !Array.isArray(msg) && 'role' in msg && msg.role === 'system')) {
                summaryRole = 'user' // some model doesn't allow multiple system messages
            }
            messages.push({ role: summaryRole, content: `Previous conversation summary: ${extractResponseContent(summary)}` })
            messages.push(...remainingMessages)
        } else {
            // If under token limit, use all messages
            messages.push(...pastMessages)
        }
    }

    /**
     * Calculates input/output and total cost from usage metadata using model pricing from models.json.
     */
    private async calculateUsageCost(
        provider: string | undefined,
        modelName: string | undefined,
        usageMetadata: Record<string, any> | undefined
    ): Promise<
        | {
              input_cost: number
              output_cost: number
              total_cost: number
              base_input_cost: number
              base_output_cost: number
          }
        | undefined
    > {
        if (!provider || !modelName) return undefined
        const inputTokens = (usageMetadata?.input_tokens ?? 0) as number
        const outputTokens = (usageMetadata?.output_tokens ?? 0) as number
        try {
            const modelConfig = await getModelConfigByModelName(MODEL_TYPE.CHAT, provider, modelName)
            if (!modelConfig) return undefined
            const baseInputCost = Number(modelConfig.input_cost) || 0
            const baseOutputCost = Number(modelConfig.output_cost) || 0
            const inputCost = inputTokens * baseInputCost
            const outputCost = outputTokens * baseOutputCost
            const totalCost = inputCost + outputCost
            if (inputCost === 0 && outputCost === 0) return undefined
            return {
                input_cost: inputCost,
                output_cost: outputCost,
                total_cost: totalCost,
                base_input_cost: baseInputCost,
                base_output_cost: baseOutputCost
            }
        } catch {
            return undefined
        }
    }
}

module.exports = { nodeClass: ConditionAgent_Agentflow }
