import { flatten } from 'lodash'
import { RunnableSequence, RunnablePassthrough, RunnableConfig } from '@langchain/core/runnables'
import { ChatPromptTemplate, MessagesPlaceholder, HumanMessagePromptTemplate } from '@langchain/core/prompts'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { HumanMessage } from '@langchain/core/messages'
import { formatToOpenAIToolMessages } from 'langchain/agents/format_scratchpad/openai_tools'
import { type ToolsAgentStep } from 'langchain/agents/openai/output_parser'
import { INode, INodeData, INodeParams, IMultiAgentNode, ITeamState, ICommonObject, MessageContentImageUrl } from '../../../src/Interface'
import { ToolCallingAgentOutputParser, AgentExecutor } from '../../../src/agents'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { getInputVariables, handleEscapeCharacters } from '../../../src/utils'

const examplePrompt = 'You are a research assistant who can search for up-to-date info using search engine.'

class Worker_MultiAgents implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    hideOutput: boolean
    inputs?: INodeParams[]
    badge?: string

    constructor() {
        this.label = 'Worker'
        this.name = 'worker'
        this.version = 2.0
        this.type = 'Worker'
        this.icon = 'worker.svg'
        this.category = 'Multi Agents'
        this.baseClasses = [this.type]
        this.hideOutput = true
        this.inputs = [
            {
                label: 'Worker Name',
                name: 'workerName',
                type: 'string',
                placeholder: 'Worker'
            },
            {
                label: 'Worker Prompt',
                name: 'workerPrompt',
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
                label: 'Supervisor',
                name: 'supervisor',
                type: 'Supervisor'
            },
            {
                label: 'Tool Calling Chat Model',
                name: 'model',
                type: 'BaseChatModel',
                optional: true,
                description: `Only compatible with models that are capable of function calling: ChatOpenAI, ChatMistral, ChatAnthropic, ChatGoogleGenerativeAI, ChatVertexAI, GroqChat. If not specified, supervisor's model will be used`
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
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        let tools = nodeData.inputs?.tools
        tools = flatten(tools)
        let workerPrompt = nodeData.inputs?.workerPrompt as string
        const workerLabel = nodeData.inputs?.workerName as string
        const supervisor = nodeData.inputs?.supervisor as IMultiAgentNode
        const maxIterations = nodeData.inputs?.maxIterations as string
        const model = nodeData.inputs?.model as BaseChatModel
        const promptValuesStr = nodeData.inputs?.promptValues

        if (!workerLabel) throw new Error('Worker name is required!')
        const workerName = workerLabel.toLowerCase().replace(/\s/g, '_').trim()

        if (!workerPrompt) throw new Error('Worker prompt is required!')

        let workerInputVariablesValues: ICommonObject = {}
        if (promptValuesStr) {
            try {
                workerInputVariablesValues = typeof promptValuesStr === 'object' ? promptValuesStr : JSON.parse(promptValuesStr)
            } catch (exception) {
                throw new Error("Invalid JSON in the Worker's Prompt Input Values: " + exception)
            }
        }
        workerInputVariablesValues = handleEscapeCharacters(workerInputVariablesValues, true)

        const llm = model || (supervisor.llm as BaseChatModel)
        const multiModalMessageContent = supervisor?.multiModalMessageContent || []

        const abortControllerSignal = options.signal as AbortController
        const workerInputVariables = getInputVariables(workerPrompt)

        if (!workerInputVariables.every((element) => Object.keys(workerInputVariablesValues).includes(element))) {
            throw new Error('Worker input variables values are not provided!')
        }

        const agent = await createAgent(
            llm,
            [...tools],
            workerPrompt,
            multiModalMessageContent,
            workerInputVariablesValues,
            maxIterations,
            {
                sessionId: options.sessionId,
                chatId: options.chatId,
                input
            }
        )

        const workerNode = async (state: ITeamState, config: RunnableConfig) =>
            await agentNode(
                {
                    state,
                    agent: agent,
                    name: workerName,
                    nodeId: nodeData.id,
                    abortControllerSignal
                },
                config
            )

        const returnOutput: IMultiAgentNode = {
            node: workerNode,
            name: workerName,
            label: workerLabel,
            type: 'worker',
            workerPrompt,
            workerInputVariables,
            parentSupervisorName: supervisor.name ?? 'supervisor'
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
        const combinedPrompt =
            systemPrompt +
            '\nWork autonomously according to your specialty, using the tools available to you.' +
            ' Do not ask for clarification.' +
            ' Your other team members (and other teams) will collaborate with you with their own specialties.' +
            ' You are chosen for a reason! You are one of the following team members: {team_members}.'

        //const toolNames = tools.length ? tools.map((t) => t.name).join(', ') : ''
        const prompt = ChatPromptTemplate.fromMessages([
            ['system', combinedPrompt],
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
        const combinedPrompt =
            systemPrompt +
            '\nWork autonomously according to your specialty, using the tools available to you.' +
            ' Do not ask for clarification.' +
            ' Your other team members (and other teams) will collaborate with you with their own specialties.' +
            ' You are chosen for a reason! You are one of the following team members: {team_members}.'

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
        nodeId,
        abortControllerSignal
    }: { state: ITeamState; agent: AgentExecutor | RunnableSequence; name: string; nodeId: string; abortControllerSignal: AbortController },
    config: RunnableConfig
) {
    try {
        if (abortControllerSignal.signal.aborted) {
            throw new Error('Aborted!')
        }

        const result = await agent.invoke({ ...state, signal: abortControllerSignal.signal }, config)
        const additional_kwargs: ICommonObject = { nodeId, type: 'worker' }
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
        throw new Error('Aborted!')
    }
}

const transformObjectPropertyToFunction = (obj: ICommonObject) => {
    const transformedObject: ICommonObject = {}

    for (const key in obj) {
        transformedObject[key] = () => obj[key]
    }

    return transformedObject
}

module.exports = { nodeClass: Worker_MultiAgents }
