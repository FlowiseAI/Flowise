import { flatten } from 'lodash'
import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeParams, ISeqAgentNode, IUsedTool } from '../../../src/Interface'
import { AIMessage, BaseMessage, ToolMessage } from '@langchain/core/messages'
import { StructuredTool } from '@langchain/core/tools'
import { mergeConfigs, RunnableConfig, Runnable } from '@langchain/core/runnables'
import { SOURCE_DOCUMENTS_PREFIX } from '../../../src/agents'
import { Document } from '@langchain/core/documents'
import { DataSource } from 'typeorm'
import { customGet, getVM } from '../commonUtils'
import { getVars, prepareSandboxVars } from '../../../src/utils'

interface MessagesState {
    messages: BaseMessage[]
}

const customOutputFuncDesc = `This is only applicable when you have a custom State at the START node. After tool execution, you might want to update the State values`

const howToUseCode = `
1. Return the key value JSON object. For example: if you have the following State:
    \`\`\`json
    {
        "user": null
    }
    \`\`\`

    You can update the "user" value by returning the following:
    \`\`\`js
    return {
        "user": "john doe"
    }
    \`\`\`

2. If you want to use the tool's output as the value to update state, it is available as \`$flow.output\` with the following structure (array):
    \`\`\`json
    [
        {
            "tool": "tool's name",
            "toolInput": {},
            "toolOutput": "tool's output content",
            "sourceDocuments": [
                {
                    "pageContent": "This is the page content",
                    "metadata": "{foo: var}",
                }
            ],
        }
    ]
    \`\`\`

    For example:
    \`\`\`js
    /* Assuming you have the following state:
    {
        "sources": null
    }
    */
    
    return {
        "sources": $flow.output[0].sourceDocuments
    }
    \`\`\`

3. You can also get default flow config, including the current "state":
    - \`$flow.sessionId\`
    - \`$flow.chatId\`
    - \`$flow.chatflowId\`
    - \`$flow.input\`
    - \`$flow.state\`

4. You can get custom variables: \`$vars.<variable-name>\`

`
const howToUse = `
1. Key and value pair to be updated. For example: if you have the following State:
    | Key       | Operation     | Default Value     |
    |-----------|---------------|-------------------|
    | user      | Replace       |                   |

    You can update the "user" value with the following:
    | Key       | Value     |
    |-----------|-----------|
    | user      | john doe  |

2. If you want to use the agent's output as the value to update state, it is available as available as \`$flow.output\` with the following structure (array):
    \`\`\`json
    [
        {
            "content": "Hello! How can I assist you today?",
            "sourceDocuments": [
                {
                    "pageContent": "This is the page content",
                    "metadata": "{foo: var}",
                }
            ],
        }
    ]
    \`\`\`

    For example:
    | Key          | Value                                     |
    |--------------|-------------------------------------------|
    | sources      | \`$flow.output[0].sourceDocuments\`       |

3. You can get default flow config, including the current "state":
    - \`$flow.sessionId\`
    - \`$flow.chatId\`
    - \`$flow.chatflowId\`
    - \`$flow.input\`
    - \`$flow.state\`

4. You can get custom variables: \`$vars.<variable-name>\`

`

const defaultFunc = `const result = $flow.output;

/* Suppose we have a custom State schema like this:
* {
    aggregate: {
        value: (x, y) => x.concat(y),
        default: () => []
    }
  }
*/

return {
  aggregate: [result.content]
};`
const TAB_IDENTIFIER = 'selectedUpdateStateMemoryTab'

class ToolNode_SeqAgents implements INode {
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

    constructor() {
        this.label = 'Tool Node'
        this.name = 'seqToolNode'
        this.version = 1.0
        this.type = 'ToolNode'
        this.icon = 'toolNode.svg'
        this.category = 'Sequential Agents'
        this.description = `Execute tool and return tool's output`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Tools',
                name: 'tools',
                type: 'Tool',
                list: true,
                optional: true
            },
            {
                label: 'LLM Node',
                name: 'llmNode',
                type: 'LLMNode'
            },
            {
                label: 'Name',
                name: 'toolNodeName',
                type: 'string',
                placeholder: 'Tool'
            },
            {
                label: 'Update State',
                name: 'updateStateMemory',
                type: 'tabs',
                tabIdentifier: TAB_IDENTIFIER,
                additionalParams: true,
                default: 'updateStateMemoryUI',
                tabs: [
                    {
                        label: 'Update State (Table)',
                        name: 'updateStateMemoryUI',
                        type: 'datagrid',
                        hint: {
                            label: 'How to use',
                            value: howToUse
                        },
                        description: customOutputFuncDesc,
                        datagrid: [
                            {
                                field: 'key',
                                headerName: 'Key',
                                type: 'asyncSingleSelect',
                                loadMethod: 'loadStateKeys',
                                flex: 0.5,
                                editable: true
                            },
                            {
                                field: 'value',
                                headerName: 'Value',
                                type: 'freeSolo',
                                valueOptions: [
                                    {
                                        label: 'All Tools Output (array)',
                                        value: '$flow.output'
                                    },
                                    {
                                        label: 'First Tool Output (string)',
                                        value: '$flow.output[0].toolOutput'
                                    },
                                    {
                                        label: 'First Tool Input Arguments (string | json)',
                                        value: '$flow.output[0].toolInput'
                                    },
                                    {
                                        label: `First Tool Returned Source Documents (array)`,
                                        value: '$flow.output[0].sourceDocuments'
                                    },
                                    {
                                        label: `Global variable (string)`,
                                        value: '$vars.<variable-name>'
                                    },
                                    {
                                        label: 'Input Question (string)',
                                        value: '$flow.input'
                                    },
                                    {
                                        label: 'Session Id (string)',
                                        value: '$flow.sessionId'
                                    },
                                    {
                                        label: 'Chat Id (string)',
                                        value: '$flow.chatId'
                                    },
                                    {
                                        label: 'Chatflow Id (string)',
                                        value: '$flow.chatflowId'
                                    }
                                ],
                                editable: true,
                                flex: 1
                            }
                        ],
                        optional: true,
                        additionalParams: true
                    },
                    {
                        label: 'Update State (Code)',
                        name: 'updateStateMemoryCode',
                        type: 'code',
                        hint: {
                            label: 'How to use',
                            value: howToUseCode
                        },
                        description: `${customOutputFuncDesc}. Must return an object representing the state`,
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
        const toolNodeLabel = nodeData.inputs?.toolNodeName as string
        const llmNode = nodeData.inputs?.llmNode as ISeqAgentNode
        if (!llmNode) throw new Error('Tool node must have a predecessor!')

        let tools = nodeData.inputs?.tools
        tools = flatten(tools)
        if (!tools || !tools.length) throw new Error('Tools must not be empty')

        const output = nodeData.outputs?.output as string

        if (!toolNodeLabel) throw new Error('Tool node name is required!')
        const toolNodeLabelName = toolNodeLabel.toLowerCase().replace(/\s/g, '_').trim()

        const toolNode = new ToolNode(tools, nodeData, input, options, toolNodeLabelName, [], { sequentialNodeName: toolNodeLabelName })

        const returnOutput: ISeqAgentNode = {
            id: nodeData.id,
            node: toolNode,
            name: toolNodeLabelName,
            label: toolNodeLabel,
            type: 'tool',
            output,
            predecessorAgents: [llmNode],
            llm: llmNode.llm,
            startLLM: llmNode.startLLM,
            moderations: llmNode.moderations,
            multiModalMessageContent: llmNode.multiModalMessageContent
        }

        return returnOutput
    }
}

interface RunnableCallableArgs extends Partial<any> {
    name?: string
    func: (...args: any[]) => any
    tags?: string[]
    trace?: boolean
    recurse?: boolean
}

class RunnableCallable<I = unknown, O = unknown> extends Runnable<I, O> {
    lc_namespace: string[] = ['langgraph']

    func: (...args: any[]) => any

    tags?: string[]

    config?: RunnableConfig

    trace: boolean = true

    recurse: boolean = true

    constructor(fields: RunnableCallableArgs) {
        super()
        this.name = fields.name ?? fields.func.name
        this.func = fields.func
        this.config = fields.tags ? { tags: fields.tags } : undefined
        this.trace = fields.trace ?? this.trace
        this.recurse = fields.recurse ?? this.recurse

        if (fields.metadata) {
            this.config = { ...this.config, metadata: { ...this.config, ...fields.metadata } }
        }
    }

    async invoke(input: any, options?: Partial<RunnableConfig> | undefined): Promise<any> {
        if (this.func === undefined) {
            return this.invoke(input, options)
        }

        let returnValue: any

        if (this.trace) {
            returnValue = await this._callWithConfig(this.func, input, mergeConfigs(this.config, options))
        } else {
            returnValue = await this.func(input, mergeConfigs(this.config, options))
        }

        if (returnValue instanceof Runnable && this.recurse) {
            return await returnValue.invoke(input, options)
        }

        return returnValue
    }
}

class ToolNode<T extends BaseMessage[] | MessagesState> extends RunnableCallable<T, T> {
    tools: StructuredTool[]
    nodeData: INodeData
    inputQuery: string
    options: ICommonObject

    constructor(
        tools: StructuredTool[],
        nodeData: INodeData,
        inputQuery: string,
        options: ICommonObject,
        name: string = 'tools',
        tags: string[] = [],
        metadata: ICommonObject = {}
    ) {
        super({ name, metadata, tags, func: (input, config) => this.run(input, config) })
        this.tools = tools
        this.nodeData = nodeData
        this.inputQuery = inputQuery
        this.options = options
    }

    private async run(input: BaseMessage[] | MessagesState, config: RunnableConfig): Promise<BaseMessage[] | MessagesState> {
        const message = Array.isArray(input) ? input[input.length - 1] : input.messages[input.messages.length - 1]

        if (message._getType() !== 'ai') {
            throw new Error('ToolNode only accepts AIMessages as input.')
        }

        const outputs = await Promise.all(
            (message as AIMessage).tool_calls?.map(async (call) => {
                const tool = this.tools.find((tool) => tool.name === call.name)
                if (tool === undefined) {
                    throw new Error(`Tool ${call.name} not found.`)
                }
                let output = await tool.invoke(call.args, config)
                let sourceDocuments: Document[] = []
                if (output?.includes(SOURCE_DOCUMENTS_PREFIX)) {
                    const outputArray = output.split(SOURCE_DOCUMENTS_PREFIX)
                    output = outputArray[0]
                    const docs = outputArray[1]
                    try {
                        sourceDocuments = JSON.parse(docs)
                    } catch (e) {
                        console.error('Error parsing source documents from tool')
                    }
                }
                return new ToolMessage({
                    name: tool.name,
                    content: typeof output === 'string' ? output : JSON.stringify(output),
                    tool_call_id: call.id!,
                    additional_kwargs: { sourceDocuments, args: call.args }
                })
            }) ?? []
        )

        const additional_kwargs: ICommonObject = { nodeId: this.nodeData.id }
        outputs.forEach((result) => (result.additional_kwargs = { ...result.additional_kwargs, ...additional_kwargs }))

        if (this.nodeData.inputs?.updateStateMemoryUI || this.nodeData.inputs?.updateStateMemoryCode) {
            const returnedOutput = await getReturnOutput(this.nodeData, this.inputQuery, this.options, outputs, input)
            return {
                ...returnedOutput,
                messages: outputs
            }
        } else {
            return Array.isArray(input) ? outputs : { messages: outputs }
        }
    }
}

const getReturnOutput = async (
    nodeData: INodeData,
    input: string,
    options: ICommonObject,
    outputs: ToolMessage[],
    state: BaseMessage[] | MessagesState
) => {
    const appDataSource = options.appDataSource as DataSource
    const databaseEntities = options.databaseEntities as IDatabaseEntity
    const tabIdentifier = nodeData.inputs?.[`${TAB_IDENTIFIER}_${nodeData.id}`] as string
    const updateStateMemoryUI = nodeData.inputs?.updateStateMemoryUI as string
    const updateStateMemoryCode = nodeData.inputs?.updateStateMemoryCode as string

    const selectedTab = tabIdentifier ? tabIdentifier.split(`_${nodeData.id}`)[0] : 'updateStateMemoryUI'
    const variables = await getVars(appDataSource, databaseEntities, nodeData)

    const reformattedOutput = outputs.map((output) => {
        return {
            tool: output.name,
            toolInput: output.additional_kwargs.args,
            toolOutput: output.content,
            sourceDocuments: output.additional_kwargs.sourceDocuments
        } as IUsedTool
    })

    const flow = {
        chatflowId: options.chatflowid,
        sessionId: options.sessionId,
        chatId: options.chatId,
        input,
        output: reformattedOutput,
        state,
        vars: prepareSandboxVars(variables)
    }

    if (selectedTab === 'updateStateMemoryUI' && updateStateMemoryUI) {
        try {
            const parsedSchema = typeof updateStateMemoryUI === 'string' ? JSON.parse(updateStateMemoryUI) : updateStateMemoryUI
            const obj: ICommonObject = {}
            for (const sch of parsedSchema) {
                const key = sch.key
                if (!key) throw new Error(`Key is required`)
                let value = sch.value as string
                if (value.startsWith('$flow')) {
                    value = customGet(flow, sch.value.replace('$flow.', ''))
                } else if (value.startsWith('$vars')) {
                    value = customGet(flow, sch.value.replace('$', ''))
                }
                obj[key] = value
            }
            return obj
        } catch (e) {
            throw new Error(e)
        }
    } else if (selectedTab === 'updateStateMemoryCode' && updateStateMemoryCode) {
        const vm = await getVM(appDataSource, databaseEntities, nodeData, flow)
        try {
            const response = await vm.run(`module.exports = async function() {${updateStateMemoryCode}}()`, __dirname)
            if (typeof response !== 'object') throw new Error('Return output must be an object')
            return response
        } catch (e) {
            throw new Error(e)
        }
    }
}

module.exports = { nodeClass: ToolNode_SeqAgents }
