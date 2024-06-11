import {
    ICommonObject,
    IDatabaseEntity,
    INode,
    INodeData,
    INodeOutputsValue,
    INodeParams,
    ISeqAgentNode,
    ISeqAgentsState
} from '../../../src/Interface'
import { availableDependencies, defaultAllowBuiltInDep, getVars, prepareSandboxVars } from '../../../src/utils'
import { DataSource } from 'typeorm'
import { NodeVM } from 'vm2'

class Condition_SeqAgents implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Condition'
        this.name = 'seqCondition'
        this.version = 1.0
        this.type = 'Condition'
        this.icon = 'condition.svg'
        this.category = 'Sequential Agents'
        this.description = 'Conditional edge to route to different agents based on condition'
        this.inputs = [
            {
                label: 'Condition Name',
                name: 'conditionName',
                type: 'string',
                optional: true,
                placeholder: 'If X, then Y'
            },
            {
                label: 'Agent',
                name: 'agent',
                type: 'Agent'
            },
            {
                label: 'Condition Function',
                name: 'conditionFunction',
                type: 'conditionFunction', // This is a custom type to show as button on the UI
                description: 'Function to evaluate the condition. You have access to $flow.state. Must return a string',
                default: `const state = $flow.state;
                
const messages = state.messages;
const lastMessage = messages[messages.length - 1];

// If there is no function call then we finish.
if (!lastMessage.additional_kwargs.function_call) {
    return "End";
}

return "Agent";`
            }
        ]
        this.baseClasses = [this.type]
        this.outputs = [
            {
                label: 'End',
                name: 'end',
                baseClasses: ['END'],
                isAnchor: true
            },
            {
                label: 'Agent',
                name: 'nextAgent',
                baseClasses: ['Agent'],
                isAnchor: true
            }
        ]
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const conditionLabel = nodeData.inputs?.conditionName as string
        const conditionName = conditionLabel.toLowerCase().replace(/\s/g, '_').trim()
        const output = nodeData.outputs?.output as string
        const agent = nodeData.inputs?.agent as ISeqAgentNode

        const workerConditionalEdge = async (state: ISeqAgentsState) => await runCondition(nodeData, input, options, state)

        const returnOutput: ISeqAgentNode = {
            ...agent,
            node: workerConditionalEdge,
            name: conditionName,
            label: conditionLabel,
            type: 'condition',
            output,
            predecessorAgent: agent
        }

        return returnOutput
    }
}

const runCondition = async (nodeData: INodeData, input: string, options: ICommonObject, state: ISeqAgentsState) => {
    const appDataSource = options.appDataSource as DataSource
    const databaseEntities = options.databaseEntities as IDatabaseEntity
    const conditionFunction = nodeData.inputs?.conditionFunction as string

    const variables = await getVars(appDataSource, databaseEntities, nodeData)
    const flow = {
        chatflowId: options.chatflowid,
        sessionId: options.sessionId,
        chatId: options.chatId,
        input,
        state
    }

    let sandbox: any = {}
    sandbox['$vars'] = prepareSandboxVars(variables)
    sandbox['$flow'] = flow

    const builtinDeps = process.env.TOOL_FUNCTION_BUILTIN_DEP
        ? defaultAllowBuiltInDep.concat(process.env.TOOL_FUNCTION_BUILTIN_DEP.split(','))
        : defaultAllowBuiltInDep
    const externalDeps = process.env.TOOL_FUNCTION_EXTERNAL_DEP ? process.env.TOOL_FUNCTION_EXTERNAL_DEP.split(',') : []
    const deps = availableDependencies.concat(externalDeps)

    const nodeVMOptions = {
        console: 'inherit',
        sandbox,
        require: {
            external: { modules: deps },
            builtin: builtinDeps
        }
    } as any

    const vm = new NodeVM(nodeVMOptions)
    try {
        const response = await vm.run(`module.exports = async function() {${conditionFunction}}()`, __dirname)
        if (typeof response !== 'string') throw new Error('Condition function must return a string')
        return response
    } catch (e) {
        throw new Error(e)
    }
}

module.exports = { nodeClass: Condition_SeqAgents }
