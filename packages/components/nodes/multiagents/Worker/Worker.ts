import { flatten } from 'lodash'
import { RunnableSequence, RunnablePassthrough, RunnableConfig } from '@langchain/core/runnables'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { HumanMessage } from '@langchain/core/messages'
import { formatToOpenAIToolMessages } from 'langchain/agents/format_scratchpad/openai_tools'
import { type ToolsAgentStep } from 'langchain/agents/openai/output_parser'
import { INode, INodeData, INodeParams, IMultiAgentNode, ITeamState, ICommonObject } from '../../../src/Interface'
import { ToolCallingAgentOutputParser, AgentExecutor } from '../../../src/agents'

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
    inputs?: INodeParams[]
    badge?: string

    constructor() {
        this.label = 'Worker'
        this.name = 'worker'
        this.version = 1.0
        this.type = 'Worker'
        this.icon = 'worker.svg'
        this.category = 'Multi Agents'
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Worker Name',
                name: 'workerName',
                type: 'string',
                placeholder: 'worker'
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
                description: `Only compatible with models that are capable of function calling. ChatOpenAI, ChatMistral, ChatAnthropic, ChatVertexAI. If not specified, supervisor's model will be used`
            },
            {
                label: 'Max Iterations',
                name: 'maxIterations',
                type: 'number',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        let tools = nodeData.inputs?.tools
        tools = flatten(tools)
        const workerPrompt = nodeData.inputs?.workerPrompt as string
        const workerName = nodeData.inputs?.workerName as string
        const supervisor = nodeData.inputs?.supervisor as IMultiAgentNode
        const maxIterations = nodeData.inputs?.maxIterations as string
        const model = nodeData.inputs?.model as BaseChatModel

        if (!workerName) throw new Error('Worker name is required!')

        const llm = model ?? (supervisor.llm as BaseChatModel)

        const agent = await createAgent(llm, [...tools], workerPrompt, maxIterations)

        const workerNode = async (state: ITeamState, config: RunnableConfig) =>
            await agentNode(
                {
                    state,
                    agent: agent,
                    name: workerName
                },
                config
            )

        const returnOutput: IMultiAgentNode = {
            node: workerNode,
            name: workerName,
            type: 'worker',
            parentSupervisorName: supervisor.name ?? 'supervisor'
        }

        return returnOutput
    }
}

async function createAgent(llm: BaseChatModel, tools: any[], systemPrompt: string, maxIterations?: string): Promise<AgentExecutor> {
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

    if (llm.bindTools === undefined) {
        throw new Error(`This agent only compatible with function calling models.`)
    }
    const modelWithTools = tools.length ? llm.bindTools(tools) : llm.bindTools([])

    const agent = RunnableSequence.from([
        //@ts-ignore
        RunnablePassthrough.assign({ agent_scratchpad: (input: { steps: ToolsAgentStep[] }) => formatToOpenAIToolMessages(input.steps) }),
        prompt,
        modelWithTools,
        new ToolCallingAgentOutputParser()
    ])
    const executor = AgentExecutor.fromAgentAndTools({
        agent: agent,
        tools,
        verbose: process.env.DEBUG === 'true' ? true : false,
        maxIterations: maxIterations ? parseFloat(maxIterations) : undefined
    })
    return executor
}

async function agentNode({ state, agent, name }: { state: any; agent: AgentExecutor; name: string }, config: RunnableConfig) {
    const result = await agent.invoke(state, config)
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
                content: result.output,
                name,
                additional_kwargs: Object.keys(additional_kwargs).length ? additional_kwargs : undefined
            })
        ]
    }
}

module.exports = { nodeClass: Worker_MultiAgents }
