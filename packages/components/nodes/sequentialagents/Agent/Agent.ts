import { flatten } from 'lodash'
import { RunnableSequence, RunnablePassthrough, RunnableConfig } from '@langchain/core/runnables'
import { ChatPromptTemplate, MessagesPlaceholder, HumanMessagePromptTemplate } from '@langchain/core/prompts'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { HumanMessage } from '@langchain/core/messages'
import { formatToOpenAIToolMessages } from 'langchain/agents/format_scratchpad/openai_tools'
import { type ToolsAgentStep } from 'langchain/agents/openai/output_parser'
import {
    INode,
    INodeData,
    INodeParams,
    ISeqAgentsState,
    ICommonObject,
    MessageContentImageUrl,
    INodeOutputsValue,
    ISeqAgentNode,
    IVisionChatModal
} from '../../../src/Interface'
import { ToolCallingAgentOutputParser, AgentExecutor } from '../../../src/agents'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { getInputVariables, handleEscapeCharacters } from '../../../src/utils'
import { addImagesToMessages, llmSupportsVision } from '../../../src/multiModalUtils'

const examplePrompt = 'You are a research assistant who can search for up-to-date info using search engine.'

class Agent_SeqAgents implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs?: INodeParams[]
    badge?: string
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Agent'
        this.name = 'seqAgent'
        this.version = 1.0
        this.type = 'Agent'
        this.icon = 'worker.svg'
        this.category = 'Sequential Agents'
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Agent Name',
                name: 'agentName',
                type: 'string',
                placeholder: 'Worker'
            },
            {
                label: 'Agent Prompt',
                name: 'agentPrompt',
                type: 'string',
                rows: 4,
                default: examplePrompt
            },
            {
                label: 'Tools',
                name: 'tools',
                type: 'Tool',
                list: true,
                optional: true
            },
            {
                label: 'Agent/Start',
                name: 'agentOrStart',
                type: 'Agent | START'
            },
            {
                label: 'Chat Model',
                name: 'model',
                type: 'BaseChatModel',
                optional: true,
                description: `Overwrite model to be used for this agent`
            },
            {
                label: 'Format Prompt Values',
                name: 'promptValues',
                type: 'json',
                optional: true,
                acceptVariable: true,
                list: true
            },
            {
                label: 'Max Iterations',
                name: 'maxIterations',
                type: 'number',
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Agent/End',
                name: 'agentOrEnd',
                baseClasses: ['Agent', 'END'],
                isAnchor: true
            }
        ]
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        let tools = nodeData.inputs?.tools
        tools = flatten(tools)
        let agentPrompt = nodeData.inputs?.agentPrompt as string
        const agentLabel = nodeData.inputs?.agentName as string
        const agentOrStart = nodeData.inputs?.agentOrStart as ISeqAgentNode
        const maxIterations = nodeData.inputs?.maxIterations as string
        const model = nodeData.inputs?.model as BaseChatModel
        const promptValuesStr = nodeData.inputs?.promptValues
        const output = nodeData.outputs?.output as string

        if (!agentLabel) throw new Error('Worker name is required!')
        const agentName = agentLabel.toLowerCase().replace(/\s/g, '_').trim()

        if (!agentPrompt) throw new Error('Worker prompt is required!')

        if (!agentOrStart) throw new Error('Agent must have a predecessor!')

        let workerInputVariablesValues: ICommonObject = {}
        if (promptValuesStr) {
            try {
                workerInputVariablesValues = typeof promptValuesStr === 'object' ? promptValuesStr : JSON.parse(promptValuesStr)
            } catch (exception) {
                throw new Error("Invalid JSON in the Worker's Prompt Input Values: " + exception)
            }
        }
        workerInputVariablesValues = handleEscapeCharacters(workerInputVariablesValues, true)

        const llm = model || (agentOrStart?.llm as BaseChatModel)
        if (nodeData.inputs) nodeData.inputs.model = llm
        const multiModalMessageContent = agentOrStart?.multiModalMessageContent || (await processImageMessage(llm, nodeData, options))
        const abortControllerSignal = options.signal as AbortController
        const workerInputVariables = getInputVariables(agentPrompt)

        if (!workerInputVariables.every((element) => Object.keys(workerInputVariablesValues).includes(element))) {
            throw new Error('Worker input variables values are not provided!')
        }

        const agentInstance = await createAgent(
            llm,
            [...tools],
            agentPrompt,
            multiModalMessageContent,
            workerInputVariablesValues,
            maxIterations,
            {
                sessionId: options.sessionId,
                chatId: options.chatId,
                input
            }
        )

        const workerNode = async (state: ISeqAgentsState, config: RunnableConfig) =>
            await agentNode(
                {
                    state,
                    agent: agentInstance,
                    name: agentName,
                    abortControllerSignal
                },
                config
            )

        const returnOutput: ISeqAgentNode = {
            node: workerNode,
            name: agentName,
            label: agentLabel,
            type: 'agent',
            llm,
            output,
            predecessorAgent: agentOrStart,
            workerPrompt: agentPrompt,
            workerInputVariables,
            multiModalMessageContent,
            moderations: agentOrStart?.moderations
        }

        return returnOutput
    }
}

async function createAgent(
    llm: BaseChatModel,
    tools: any[],
    systemPrompt: string,
    multiModalMessageContent: MessageContentImageUrl[],
    workerInputVariablesValues: ICommonObject,
    maxIterations?: string,
    flowObj?: { sessionId?: string; chatId?: string; input?: string }
): Promise<AgentExecutor | RunnableSequence> {
    if (tools.length) {
        //const toolNames = tools.length ? tools.map((t) => t.name).join(', ') : ''
        const prompt = ChatPromptTemplate.fromMessages([
            ['system', systemPrompt],
            new MessagesPlaceholder('messages'),
            new MessagesPlaceholder('agent_scratchpad')
            /* Gettind rid of this for now because other LLMs dont support system message at later stage
            [
                'system',
                [
                    'Supervisor instructions: {instructions}\n' + tools.length
                        ? `Remember, you individually can only use these tools: ${toolNames}`
                        : '' + '\n\nEnd if you have already completed the requested task. Communicate the work completed.'
                ].join('\n')
            ]*/
        ])

        if (multiModalMessageContent.length) {
            const msg = HumanMessagePromptTemplate.fromTemplate([...multiModalMessageContent])
            prompt.promptMessages.splice(1, 0, msg)
        }

        if (llm.bindTools === undefined) {
            throw new Error(`This agent only compatible with function calling models.`)
        }
        const modelWithTools = llm.bindTools(tools)

        let agent

        if (!workerInputVariablesValues || !Object.keys(workerInputVariablesValues).length) {
            agent = RunnableSequence.from([
                RunnablePassthrough.assign({
                    //@ts-ignore
                    agent_scratchpad: (input: { steps: ToolsAgentStep[] }) => formatToOpenAIToolMessages(input.steps)
                }),
                prompt,
                modelWithTools,
                new ToolCallingAgentOutputParser()
            ])
        } else {
            agent = RunnableSequence.from([
                RunnablePassthrough.assign({
                    //@ts-ignore
                    agent_scratchpad: (input: { steps: ToolsAgentStep[] }) => formatToOpenAIToolMessages(input.steps)
                }),
                RunnablePassthrough.assign(transformObjectPropertyToFunction(workerInputVariablesValues)),
                prompt,
                modelWithTools,
                new ToolCallingAgentOutputParser()
            ])
        }

        const executor = AgentExecutor.fromAgentAndTools({
            agent,
            tools,
            sessionId: flowObj?.sessionId,
            chatId: flowObj?.chatId,
            input: flowObj?.input,
            verbose: process.env.DEBUG === 'true' ? true : false,
            maxIterations: maxIterations ? parseFloat(maxIterations) : undefined
        })
        return executor
    } else {
        const combinedPrompt = systemPrompt
        const prompt = ChatPromptTemplate.fromMessages([['system', combinedPrompt], new MessagesPlaceholder('messages')])
        if (multiModalMessageContent.length) {
            const msg = HumanMessagePromptTemplate.fromTemplate([...multiModalMessageContent])
            prompt.promptMessages.splice(1, 0, msg)
        }

        let conversationChain

        if (!workerInputVariablesValues || !Object.keys(workerInputVariablesValues).length) {
            conversationChain = RunnableSequence.from([prompt, llm, new StringOutputParser()])
        } else {
            conversationChain = RunnableSequence.from([
                RunnablePassthrough.assign(transformObjectPropertyToFunction(workerInputVariablesValues)),
                prompt,
                llm,
                new StringOutputParser()
            ])
        }
        return conversationChain
    }
}

async function agentNode(
    {
        state,
        agent,
        name,
        abortControllerSignal
    }: { state: ISeqAgentsState; agent: AgentExecutor | RunnableSequence; name: string; abortControllerSignal: AbortController },
    config: RunnableConfig
) {
    try {
        if (abortControllerSignal.signal.aborted) {
            throw new Error('Aborted!')
        }

        const result = await agent.invoke({ ...state, signal: abortControllerSignal.signal }, config)
        const additional_kwargs: ICommonObject = {}
        if (result.usedTools) {
            additional_kwargs.usedTools = result.usedTools
        }
        if (result.sourceDocuments) {
            additional_kwargs.sourceDocuments = result.sourceDocuments
        }
        return {
            messages: [
                new HumanMessage({
                    content: typeof result === 'string' ? result : result.output,
                    name,
                    additional_kwargs: Object.keys(additional_kwargs).length ? additional_kwargs : undefined
                })
            ]
        }
    } catch (error) {
        throw new Error(error)
    }
}

const transformObjectPropertyToFunction = (obj: ICommonObject) => {
    const transformedObject: ICommonObject = {}

    for (const key in obj) {
        transformedObject[key] = () => obj[key]
    }

    return transformedObject
}

const processImageMessage = async (llm: BaseChatModel, nodeData: INodeData, options: ICommonObject) => {
    let multiModalMessageContent: MessageContentImageUrl[] = []

    if (llmSupportsVision(llm)) {
        const visionChatModel = llm as IVisionChatModal
        multiModalMessageContent = await addImagesToMessages(nodeData, options, llm.multiModalOption)

        if (multiModalMessageContent?.length) {
            visionChatModel.setVisionModel()
        } else {
            visionChatModel.revertToOriginalModel()
        }
    }

    return multiModalMessageContent
}

module.exports = { nodeClass: Agent_SeqAgents }
