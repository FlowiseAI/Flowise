import { flatten } from 'lodash'
import { ChatOpenAI } from '@langchain/openai'
import { OllamaFunctions } from 'langchain/experimental/chat_models/ollama_functions'
import { Runnable } from '@langchain/core/runnables'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { JsonOutputToolsParser } from 'langchain/output_parsers'
import { ILangGraphNode, INode, INodeData, INodeParams } from '../../../src/Interface'

const sysPrompt = `You are a supervisor tasked with managing a conversation between the following workers: {team_members}.
Given the following user request, respond with the worker to act next.
Each worker will perform a task and respond with their results and status.
When finished, respond with FINISH.

Select strategically to minimize the number of steps taken.`

class Supervisor_LangGraph implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs?: INodeParams[]
    badge?: string

    constructor() {
        this.label = 'Supervisor'
        this.name = 'supervisor'
        this.version = 1.0
        this.type = 'Supervisor'
        this.icon = 'supervisor.svg'
        this.category = 'LangGraph'
        this.baseClasses = [this.type]
        this.badge = 'BETA'
        this.inputs = [
            {
                label: 'Supervisor Name',
                name: 'supervisorName',
                type: 'string',
                placeholder: 'My Supervisor'
            },
            {
                label: 'Supervisor Prompt',
                name: 'supervisorPrompt',
                type: 'string',
                rows: 4,
                warning: 'Prompt must contains {team_members}',
                default: sysPrompt
            },
            {
                label: 'Chat Model',
                name: 'llm',
                type: 'BaseChatModel',
                description:
                    'Only compatible with Chat Model with Function Calling: ChatOpenAI, AzureChatOpenAI, ChatMistral, OllamaFunctions'
            },
            {
                label: 'Recursion Limit',
                name: 'recursionLimit',
                type: 'number',
                default: 100
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const llm = nodeData.inputs?.llm as ChatOpenAI | OllamaFunctions
        const supervisorPrompt = nodeData.inputs?.supervisorPrompt as string
        const supervisorName = nodeData.inputs?.supervisorName as string
        const _recursionLimit = nodeData.inputs?.recursionLimit as string
        const recursionLimit = _recursionLimit ? parseFloat(_recursionLimit) : 100

        const workersNodes: ILangGraphNode[] =
            nodeData.inputs?.workerNodes && nodeData.inputs?.workerNodes.length ? flatten(nodeData.inputs?.workerNodes) : []
        const workersNodeNames = workersNodes.map((node: ILangGraphNode) => node.name)

        async function createTeamSupervisor(llm: ChatOpenAI | OllamaFunctions, systemPrompt: string, members: string[]): Promise<Runnable> {
            const options = ['FINISH', ...members]
            const functionDef = {
                name: 'route',
                description: 'Select the next role.',
                parameters: {
                    title: 'routeSchema',
                    type: 'object',
                    properties: {
                        reasoning: {
                            title: 'Reasoning',
                            type: 'string'
                        },
                        next: {
                            title: 'Next',
                            anyOf: [{ enum: options }]
                        },
                        instructions: {
                            title: 'Instructions',
                            type: 'string',
                            description: 'The specific instructions of the sub-task the next role should accomplish.'
                        }
                    },
                    required: ['reasoning', 'next', 'instructions']
                }
            }
            const toolDef = {
                type: 'function',
                function: functionDef
            }
            let prompt = ChatPromptTemplate.fromMessages([
                ['system', systemPrompt],
                new MessagesPlaceholder('messages'),
                ['system', 'Given the conversation above, who should act next? Or should we FINISH? Select one of: {options}']
            ])
            prompt = await prompt.partial({ options: options.join(', '), team_members: members.join(', ') })

            const supervisor = prompt
                //@ts-ignore
                .pipe(llm.bind({ tools: [toolDef], tool_choice: { type: 'function', function: { name: 'route' } } }))
                .pipe(new JsonOutputToolsParser())
                // select the first one
                .pipe((x) => ({
                    //@ts-ignore
                    next: x[0].args.next,
                    //@ts-ignore
                    instructions: x[0].args.instructions
                }))

            return supervisor
        }

        const supervisorAgent = await createTeamSupervisor(llm, supervisorPrompt ? supervisorPrompt : sysPrompt, workersNodeNames)

        const returnOutput: ILangGraphNode = {
            node: supervisorAgent,
            name: supervisorName,
            type: 'supervisor',
            workers: workersNodeNames,
            recursionLimit,
            llm
        }

        return returnOutput
    }
}

module.exports = { nodeClass: Supervisor_LangGraph }
