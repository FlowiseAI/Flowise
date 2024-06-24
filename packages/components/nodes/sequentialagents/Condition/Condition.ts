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

const howToUseCode = `
1. Must return a string value at the end of function:
    - Any string value will be considered as the connection point to next Agent. Only 1 agent can be connected at a time.
    - If you want to end the flow, return "End", and conenct the "End" node.

2. You can get default flow config:
    - \`$flow.sessionId\`
    - \`$flow.chatId\`
    - \`$flow.chatflowId\`
    - \`$flow.input\`
    - \`$flow.state\`

3. You can get messages from the state: \`$flow.state.messages\`:
    \`\`\`json
    [
        {
            "content": "Hello! How can I assist you today?",
            "name": "",
            "additional_kwargs": {},
            "response_metadata": {},
            "tool_calls": [],
            "invalid_tool_calls": [],
            "usage_metadata": {}
        }
    ]
    \`\`\`

4. You can get custom variables: \`$vars.<variable-name>\`

`

const defaultFunc = `const state = $flow.state;
                
const messages = state.messages;

const lastMessage = messages[messages.length - 1];

/* Check if the last message has content */
if (lastMessage.content) {
    return "Agent";
}

return "End";`

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
        this.description = 'Conditional function to determine which route to take next'
        this.inputs = [
            {
                label: 'Condition Name',
                name: 'conditionName',
                type: 'string',
                optional: true,
                placeholder: 'If X, then Y'
            },
            {
                label: 'Agent/Start',
                name: 'agentOrStart',
                type: 'Agent | START',
                list: true
            },
            {
                label: 'Condition Function',
                name: 'conditionFunction',
                type: 'conditionFunction', // This is a custom type to show as button on the UI
                description: 'Function to evaluate the condition',
                hint: {
                    label: 'How to use',
                    value: howToUseCode
                },
                hideCodeExecute: true,
                default: defaultFunc,
                codeExample: defaultFunc
            }
        ]
        this.baseClasses = [this.type]
        this.outputs = [
            {
                label: 'Agent',
                name: 'agent',
                baseClasses: ['Agent'],
                isAnchor: true
            },
            {
                label: 'End',
                name: 'end',
                baseClasses: ['END'],
                isAnchor: true
            }
        ]
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const conditionLabel = nodeData.inputs?.conditionName as string
        const conditionName = conditionLabel.toLowerCase().replace(/\s/g, '_').trim()
        const output = nodeData.outputs?.output as string
        const agentOrStart = nodeData.inputs?.agentOrStart as ISeqAgentNode[]

        if (!agentOrStart || !agentOrStart.length) throw new Error('Condition must have a predecessor!')

        const workerConditionalEdge = async (state: ISeqAgentsState) => await runCondition(nodeData, input, options, state)

        const returnOutput: ISeqAgentNode = {
            id: nodeData.id,
            node: workerConditionalEdge,
            name: conditionName,
            label: conditionLabel,
            type: 'condition',
            output,
            llm: agentOrStart[0]?.llm,
            multiModalMessageContent: agentOrStart[0]?.multiModalMessageContent,
            predecessorAgents: agentOrStart
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
