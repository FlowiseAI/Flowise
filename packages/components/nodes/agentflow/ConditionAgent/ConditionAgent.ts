import { AnalyticHandler } from '../../../src/handler'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeOutputsValue, INodeParams, IUsedTool } from '../../../src/Interface'
import { AIMessageChunk, BaseMessageLike } from '@langchain/core/messages'
import { getUniqueImageMessages, processMessagesWithImages } from '../utils'
import { CONDITION_AGENT_TOOL_NAME, DEFAULT_SUMMARIZER_TEMPLATE } from '../prompt'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { z } from 'zod'
import { StructuredTool } from '@langchain/core/tools'
import zodToJsonSchema from 'zod-to-json-schema'

const DEFAULT_INSTRUCTIONS = `You are part of a multi-agent system designed to make agent coordination and execution easy. Your are given an input and a set of scenarios, your goal is to analyze the conversation, identify the matching scenario, then use one of the tools provided to answer the user's question.

Scenarios: {scenarios}
`
const DEFAULT_USER_MESSAGE = `From the conversation, what is the best tool to use? Only use the tools that are provided.`

class ScenarioTool extends StructuredTool {
    name = ''
    description = ''
    schema

    constructor(fields: ICommonObject) {
        super()
        this.name = fields.name
        this.description = fields.description
        this.schema = fields.schema
    }

    async _call() {
        return ''
    }
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
        this.version = 1.0
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
                rows: 4,
                acceptVariable: true,
                default: DEFAULT_INSTRUCTIONS
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

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
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
            let input = conditionAgentInput || DEFAULT_USER_MESSAGE
            const conditionAgentInstructions = nodeData.inputs?.conditionAgentInstructions as string

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

            let structuredOutputs = []
            let tools = []
            let usedTools: IUsedTool[] = []

            // generate name and description for each scenario
            for (const _scenario of _conditionAgentScenarios) {
                const scenarioContent = _scenario.scenario
                const response = await llmNodeInstance.invoke(CONDITION_AGENT_TOOL_NAME.replace('{scenario}', scenarioContent))
                const _scenarioName = typeof response.content === 'string' ? response.content : scenarioContent.substring(0, 30)
                // convert to small case and replace space with underscore
                const scenarioName = _scenarioName
                    .trim()
                    .toLowerCase()
                    .replace(/ /g, '_')
                    .replace(/[^a-z0-9_-]/g, '')
                const scenarioDescription = scenarioContent

                const zodObj: ICommonObject = {}
                zodObj[scenarioName] = z.string().describe(scenarioDescription || '')
                const structuredOutput = z.object(zodObj)

                const tool = new ScenarioTool({
                    name: scenarioName,
                    description: scenarioDescription,
                    schema: structuredOutput
                })
                tools.push(tool)

                structuredOutputs.push({
                    name: scenarioName,
                    description: scenarioDescription,
                    schema: structuredOutput
                })
            }
            if (llmNodeInstance && tools.length > 0) {
                // @ts-ignore
                llmNodeInstance = llmNodeInstance.bindTools(tools)
            }

            const availableTools: ISimpliefiedTool[] = tools.map((tool) => {
                const componentNode = options.componentNodes['customTool']

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

            // Prepare messages array
            const messages: BaseMessageLike[] = [
                {
                    role: 'system',
                    content: conditionAgentInstructions.replace(
                        '{scenarios}',
                        _conditionAgentScenarios.map((scenario) => scenario.scenario).join('\n')
                    )
                }
            ]

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
            } else if (input && typeof input === 'string') {
                // If memory is disabled, just add the current question
                // Add images to messages if exist
                if (options.uploads) {
                    const imageContents = await getUniqueImageMessages(options, messages, modelConfig)
                    if (imageContents) {
                        const { llmMessages } = imageContents
                        messages.push(llmMessages)
                    }
                } else {
                    messages.push({
                        role: 'user',
                        content: input
                    })
                }
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

            let calledOutputName = 'default'

            if (response.tool_calls && response.tool_calls.length > 0) {
                const inputArgs = response.tool_calls[0].args
                calledOutputName = Object.keys(inputArgs)[0]
                usedTools = response.tool_calls.map((toolCall) => {
                    return {
                        tool: toolCall.name,
                        toolInput: toolCall.args,
                        toolOutput: ''
                    }
                })
            }

            // Clean up empty inputs
            for (const key in nodeData.inputs) {
                if (nodeData.inputs[key] === '') {
                    delete nodeData.inputs[key]
                }
            }

            const conditions = structuredOutputs.map((output) => {
                return {
                    output: output.name,
                    isFullfilled: output.name === calledOutputName
                }
            })

            // If no condition is fullfilled, add isFullfilled to the ELSE condition
            const dummyElseConditionData = {
                output: 'default'
            }
            if (!conditions.some((c) => c.isFullfilled)) {
                conditions.push({
                    ...dummyElseConditionData,
                    isFullfilled: true
                })
            } else {
                conditions.push({
                    ...dummyElseConditionData,
                    isFullfilled: false
                })
            }

            const returnOutput = {
                id: nodeData.id,
                name: this.name,
                input: { messages },
                output: {
                    conditions,
                    content:
                        response.tool_calls && response.tool_calls.length > 0
                            ? JSON.stringify(response.tool_calls, null, 2)
                            : response.content,
                    availableTools,
                    usedTools,
                    timeMetadata: {
                        start: startTime,
                        end: endTime,
                        delta: timeDelta
                    }
                },
                state
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
        let pastMessages = [...pastChatHistory, ...runtimeChatHistory]
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
                const { llmMessages } = imageContents
                messages.push(llmMessages)
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
