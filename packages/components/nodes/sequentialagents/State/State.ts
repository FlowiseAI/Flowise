import { START } from '@langchain/langgraph'
import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeParams, ISeqAgentNode } from '../../../src/Interface'
import { availableDependencies, defaultAllowBuiltInDep, getVars, prepareSandboxVars } from '../../../src/utils'
import { NodeVM } from 'vm2'
import { DataSource } from 'typeorm'

const defaultFunc = `{
    aggregate: {
        value: (x, y) => x.concat(y), // here we append the new message to the existing messages
        default: () => []
    }
}`

const howToUse = `
Specify the Key, Operation Type, and Default Value for the state object. The Operation Type can be either "Replace" or "Append".

**Replace**
- Replace the existing value with the new value.
- If the new value is null, the existing value will be retained.

**Append**
- Append the new value to the existing value.
- Default value can be empty or an array. Ex: ["a", "b"]
- Final value is an array.
`
const TAB_IDENTIFIER = 'selectedStateTab'

class State_SeqAgents implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    documentation?: string
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'State'
        this.name = 'seqState'
        this.version = 2.0
        this.type = 'State'
        this.icon = 'state.svg'
        this.category = 'Sequential Agents'
        this.description = 'A centralized state object, updated by nodes in the graph, passing from one node to another'
        this.baseClasses = [this.type]
        this.documentation = 'https://docs.flowiseai.com/using-flowise/agentflows/sequential-agents#id-3.-state-node'
        this.inputs = [
            {
                label: 'Custom State',
                name: 'stateMemory',
                type: 'tabs',
                tabIdentifier: TAB_IDENTIFIER,
                additionalParams: true,
                default: 'stateMemoryUI',
                tabs: [
                    {
                        label: 'Custom State (Table)',
                        name: 'stateMemoryUI',
                        type: 'datagrid',
                        description:
                            'Structure for state. By default, state contains "messages" that got updated with each message sent and received.',
                        hint: {
                            label: 'How to use',
                            value: howToUse
                        },
                        datagrid: [
                            { field: 'key', headerName: 'Key', editable: true },
                            {
                                field: 'type',
                                headerName: 'Operation',
                                type: 'singleSelect',
                                valueOptions: ['Replace', 'Append'],
                                editable: true
                            },
                            { field: 'defaultValue', headerName: 'Default Value', flex: 1, editable: true }
                        ],
                        optional: true,
                        additionalParams: true
                    },
                    {
                        label: 'Custom State (Code)',
                        name: 'stateMemoryCode',
                        type: 'code',
                        description: `JSON object representing the state`,
                        hideCodeExecute: true,
                        codeExample: defaultFunc,
                        optional: true,
                        additionalParams: true
                    }
                ]
            }
        ]
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const tabIdentifier = nodeData.inputs?.[`${TAB_IDENTIFIER}_${nodeData.id}`] as string
        const stateMemoryUI = nodeData.inputs?.stateMemoryUI as string
        const stateMemoryCode = nodeData.inputs?.stateMemoryCode as string
        const appDataSource = options.appDataSource as DataSource
        const databaseEntities = options.databaseEntities as IDatabaseEntity
        const selectedTab = tabIdentifier ? tabIdentifier.split(`_${nodeData.id}`)[0] : 'stateMemoryUI'
        const stateMemory = nodeData.inputs?.stateMemory as string

        if (stateMemory && stateMemory !== 'stateMemoryUI' && stateMemory !== 'stateMemoryCode') {
            try {
                const parsedSchema = typeof stateMemory === 'string' ? JSON.parse(stateMemory) : stateMemory
                const obj: ICommonObject = {}
                for (const sch of parsedSchema) {
                    const key = sch.Key
                    if (!key) throw new Error(`Key is required`)
                    const type = sch.Operation
                    const defaultValue = sch['Default Value']

                    if (type === 'Append') {
                        obj[key] = {
                            value: (x: any, y: any) => (Array.isArray(y) ? x.concat(y) : x.concat([y])),
                            default: () => (defaultValue ? JSON.parse(defaultValue) : [])
                        }
                    } else {
                        obj[key] = {
                            value: (x: any, y: any) => y ?? x,
                            default: () => defaultValue
                        }
                    }
                }
                const returnOutput: ISeqAgentNode = {
                    id: nodeData.id,
                    node: obj,
                    name: 'state',
                    label: 'state',
                    type: 'state',
                    output: START
                }
                return returnOutput
            } catch (e) {
                throw new Error(e)
            }
        }

        if (!stateMemoryUI && !stateMemoryCode) {
            const returnOutput: ISeqAgentNode = {
                id: nodeData.id,
                node: {},
                name: 'state',
                label: 'state',
                type: 'state',
                output: START
            }
            return returnOutput
        }

        if (selectedTab === 'stateMemoryUI' && stateMemoryUI) {
            try {
                const parsedSchema = typeof stateMemoryUI === 'string' ? JSON.parse(stateMemoryUI) : stateMemoryUI
                const obj: ICommonObject = {}
                for (const sch of parsedSchema) {
                    const key = sch.key
                    if (!key) throw new Error(`Key is required`)
                    const type = sch.type
                    const defaultValue = sch.defaultValue

                    if (type === 'Append') {
                        obj[key] = {
                            value: (x: any, y: any) => (Array.isArray(y) ? x.concat(y) : x.concat([y])),
                            default: () => (defaultValue ? JSON.parse(defaultValue) : [])
                        }
                    } else {
                        obj[key] = {
                            value: (x: any, y: any) => y ?? x,
                            default: () => defaultValue
                        }
                    }
                }
                const returnOutput: ISeqAgentNode = {
                    id: nodeData.id,
                    node: obj,
                    name: 'state',
                    label: 'state',
                    type: 'state',
                    output: START
                }
                return returnOutput
            } catch (e) {
                throw new Error(e)
            }
        } else if (selectedTab === 'stateMemoryCode' && stateMemoryCode) {
            const variables = await getVars(appDataSource, databaseEntities, nodeData)
            const flow = {
                chatflowId: options.chatflowid,
                sessionId: options.sessionId,
                chatId: options.chatId,
                input
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
                const response = await vm.run(`module.exports = async function() {return ${stateMemoryCode}}()`, __dirname)
                if (typeof response !== 'object') throw new Error('State must be an object')
                const returnOutput: ISeqAgentNode = {
                    id: nodeData.id,
                    node: response,
                    name: 'state',
                    label: 'state',
                    type: 'state',
                    output: START
                }
                return returnOutput
            } catch (e) {
                throw new Error(e)
            }
        }
    }
}

module.exports = { nodeClass: State_SeqAgents }
