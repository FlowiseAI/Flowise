import { flatten, get } from 'lodash'
import { RunnableSequence, RunnablePassthrough, RunnableConfig } from '@langchain/core/runnables'
import { ChatPromptTemplate, MessagesPlaceholder, HumanMessagePromptTemplate, BaseMessagePromptTemplateLike } from '@langchain/core/prompts'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { AIMessage, BaseMessage } from '@langchain/core/messages'
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
    IVisionChatModal,
    IDatabaseEntity
} from '../../../src/Interface'
import { ToolCallingAgentOutputParser, AgentExecutor } from '../../../src/agents'
import { StringOutputParser } from '@langchain/core/output_parsers'
import {
    availableDependencies,
    defaultAllowBuiltInDep,
    getInputVariables,
    getVars,
    handleEscapeCharacters,
    prepareSandboxVars
} from '../../../src/utils'
import { addImagesToMessages, llmSupportsVision } from '../../../src/multiModalUtils'
import { DataSource } from 'typeorm'
import { NodeVM } from 'vm2'

const examplePrompt = 'You are a research assistant who can search for up-to-date info using search engine.'
const customOutputFuncDesc = `This is only applicable when you have a custom State at the START node. After agent execution, you might want to update the State values`
const howToUseCode = `
1. Must return an object. Object must contains at least one key that matches State's schema

2. Agent's output is available as \`$flow.output\` with the following structure:
    \`\`\`json
    {
        "output": "Hello! How can I assist you today?",
        "usedTools": [
            {
                "tool": "tool-name",
                "toolInput": "{foo: var}",
                "toolOutput": "This is the tool's output"
            }
        ],
        "sourceDocuments": [
            {
                "pageContent": "This is the page content",
                "metadata": "{foo: var}",
            }
        ],
    }
    \`\`\`

3. You can get default flow config:
    - \`$flow.sessionId\`
    - \`$flow.chatId\`
    - \`$flow.chatflowId\`
    - \`$flow.input\`
    - \`$flow.state\`

4. You can get custom variables: \`$vars.<variable-name>\`

`
const howToUse = `
1. Fill in the key and value pair to be updated. Key must exists in the State schema

2. Agent's output is available as \`$flow.output\` with the following structure:
    \`\`\`json
    {
        "output": "Hello! How can I assist you today?",
        "usedTools": [
            {
                "tool": "tool-name",
                "toolInput": "{foo: var}",
                "toolOutput": "This is the tool's output"
            }
        ],
        "sourceDocuments": [
            {
                "pageContent": "This is the page content",
                "metadata": "{foo: var}",
            }
        ],
    }
    \`\`\`

3. You can get default flow config:
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
  aggregate: [result.output] //update state by returning an object with the same schema
};`

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
                placeholder: 'Agent'
            },
            {
                label: 'System Prompt',
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
                type: 'Agent | START',
                list: true
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
                label: 'Update State',
                name: 'updateStateMemory',
                type: 'datagrid',
                hint: {
                    label: 'How to use',
                    value: howToUse
                },
                description: customOutputFuncDesc,
                datagrid: [
                    { field: 'key', headerName: 'Key', editable: true },
                    { field: 'value', headerName: 'Value', editable: true, flex: 1 }
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
                description: `${customOutputFuncDesc}. This will be used when both "Update State" and "Update State (Code)" are provided. Must return an object representing the state`,
                hideCodeExecute: true,
                codeExample: defaultFunc,
                optional: true,
                additionalParams: true
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

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        let tools = nodeData.inputs?.tools
        tools = flatten(tools)
        let agentPrompt = nodeData.inputs?.agentPrompt as string
        const agentLabel = nodeData.inputs?.agentName as string
        const agentOrStart = nodeData.inputs?.agentOrStart as ISeqAgentNode[]
        const maxIterations = nodeData.inputs?.maxIterations as string
        const model = nodeData.inputs?.model as BaseChatModel
        const promptValuesStr = nodeData.inputs?.promptValues
        const output = nodeData.outputs?.output as string

        if (!agentLabel) throw new Error('Worker name is required!')
        const agentName = agentLabel.toLowerCase().replace(/\s/g, '_').trim()

        if (!agentPrompt) throw new Error('Worker prompt is required!')

        if (!agentOrStart || !agentOrStart.length) throw new Error('Agent must have a predecessor!')

        let workerInputVariablesValues: ICommonObject = {}
        if (promptValuesStr) {
            try {
                workerInputVariablesValues = typeof promptValuesStr === 'object' ? promptValuesStr : JSON.parse(promptValuesStr)
            } catch (exception) {
                throw new Error("Invalid JSON in the Worker's Prompt Input Values: " + exception)
            }
        }
        workerInputVariablesValues = handleEscapeCharacters(workerInputVariablesValues, true)

        const llm = model || agentOrStart[0].llm
        if (nodeData.inputs) nodeData.inputs.model = llm
        const multiModalMessageContent = agentOrStart[0]?.multiModalMessageContent || (await processImageMessage(llm, nodeData, options))
        const abortControllerSignal = options.signal as AbortController
        const workerInputVariables = getInputVariables(agentPrompt)

        if (!workerInputVariables.every((element) => Object.keys(workerInputVariablesValues).includes(element))) {
            throw new Error('Worker input variables values are not provided!')
        }

        const workerNode = async (state: ISeqAgentsState, config: RunnableConfig) =>
            await agentNode(
                {
                    state,
                    agent: await createAgent(
                        state,
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
                    ),
                    name: agentName,
                    abortControllerSignal,
                    nodeData,
                    input,
                    options
                },
                config
            )

        const returnOutput: ISeqAgentNode = {
            id: nodeData.id,
            node: workerNode,
            name: agentName,
            label: agentLabel,
            type: 'agent',
            llm,
            output,
            predecessorAgents: agentOrStart,
            workerPrompt: agentPrompt,
            workerInputVariables,
            multiModalMessageContent,
            moderations: agentOrStart[0]?.moderations
        }

        return returnOutput
    }
}

async function createAgent(
    state: ISeqAgentsState,
    llm: BaseChatModel,
    tools: any[],
    systemPrompt: string,
    multiModalMessageContent: MessageContentImageUrl[],
    workerInputVariablesValues: ICommonObject,
    maxIterations?: string,
    flowObj?: { sessionId?: string; chatId?: string; input?: string }
): Promise<AgentExecutor | RunnableSequence> {
    if (tools.length) {
        const promptArrays = [
            ['system', systemPrompt],
            new MessagesPlaceholder('messages'),
            new MessagesPlaceholder('agent_scratchpad')
        ] as BaseMessagePromptTemplateLike[]
        const prompt = ChatPromptTemplate.fromMessages(promptArrays)

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
                RunnablePassthrough.assign(transformObjectPropertyToFunction(workerInputVariablesValues, state)),
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
        const promptArrays = [['system', systemPrompt], new MessagesPlaceholder('messages')] as BaseMessagePromptTemplateLike[]
        const prompt = ChatPromptTemplate.fromMessages(promptArrays)
        if (multiModalMessageContent.length) {
            const msg = HumanMessagePromptTemplate.fromTemplate([...multiModalMessageContent])
            prompt.promptMessages.splice(1, 0, msg)
        }

        let conversationChain

        if (!workerInputVariablesValues || !Object.keys(workerInputVariablesValues).length) {
            conversationChain = RunnableSequence.from([prompt, llm, new StringOutputParser()])
        } else {
            conversationChain = RunnableSequence.from([
                RunnablePassthrough.assign(transformObjectPropertyToFunction(workerInputVariablesValues, state)),
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
        abortControllerSignal,
        nodeData,
        input,
        options
    }: {
        state: ISeqAgentsState
        agent: AgentExecutor | RunnableSequence
        name: string
        abortControllerSignal: AbortController
        nodeData: INodeData
        input: string
        options: ICommonObject
    },
    config: RunnableConfig
) {
    try {
        if (abortControllerSignal.signal.aborted) {
            throw new Error('Aborted!')
        }
        const result = await agent.invoke({ ...state, signal: abortControllerSignal.signal }, config)
        const additional_kwargs: ICommonObject = { nodeId: nodeData.id }
        if (result.usedTools) {
            additional_kwargs.usedTools = result.usedTools
        }
        if (result.sourceDocuments) {
            additional_kwargs.sourceDocuments = result.sourceDocuments
        }

        if (nodeData.inputs?.updateStateMemory || nodeData.inputs?.updateStateMemoryCode) {
            let output = result
            if (typeof result === 'string') output = { output: result }
            const returnedOutput = await getReturnOutput(nodeData, input, options, output, state)
            return {
                ...returnedOutput,
                messages: convertCustomMessagesToAIMessages([typeof result === 'string' ? result : result.output], name, additional_kwargs)
            }
        } else {
            return {
                messages: [
                    new AIMessage({
                        content: typeof result === 'string' ? result : result.output,
                        name,
                        additional_kwargs: Object.keys(additional_kwargs).length ? additional_kwargs : undefined
                    })
                ]
            }
        }
    } catch (error) {
        throw new Error(error)
    }
}

const getReturnOutput = async (nodeData: INodeData, input: string, options: ICommonObject, output: any, state: ISeqAgentsState) => {
    const appDataSource = options.appDataSource as DataSource
    const databaseEntities = options.databaseEntities as IDatabaseEntity
    const updateStateMemory = nodeData.inputs?.updateStateMemory as string
    const updateStateMemoryCode = nodeData.inputs?.updateStateMemoryCode as string

    const flow = {
        chatflowId: options.chatflowid,
        sessionId: options.sessionId,
        chatId: options.chatId,
        input,
        output,
        state
    }

    if (updateStateMemory && !updateStateMemoryCode) {
        try {
            const parsedSchema = typeof updateStateMemory === 'string' ? JSON.parse(updateStateMemory) : updateStateMemory
            const obj: ICommonObject = {}
            for (const sch of parsedSchema) {
                const key = sch.key
                if (!key) throw new Error(`Key is required`)
                let value = sch.value as string
                if (value.startsWith('$flow')) {
                    value = get(flow, sch.value.replace('$flow.', ''))
                }
                obj[key] = value
            }
            return obj
        } catch (e) {
            throw new Error(e)
        }
    }

    const variables = await getVars(appDataSource, databaseEntities, nodeData)

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
        const response = await vm.run(`module.exports = async function() {${updateStateMemoryCode}}()`, __dirname)
        if (typeof response !== 'object') throw new Error('Return output must be an object')
        return response
    } catch (e) {
        throw new Error(e)
    }
}

const convertCustomMessagesToAIMessages = (messages: string[], name: string, additional_kwargs: ICommonObject) => {
    return messages.map((message) => {
        return new AIMessage({
            content: message,
            name: name,
            additional_kwargs: Object.keys(additional_kwargs).length ? additional_kwargs : undefined
        })
    })
}

const transformObjectPropertyToFunction = (obj: ICommonObject, state: ISeqAgentsState) => {
    const transformedObject: ICommonObject = {}

    for (const key in obj) {
        let value = obj[key]
        try {
            const parsedValue = JSON.parse(value)
            if (typeof parsedValue === 'object' && parsedValue.id) {
                const messageOutput = ((state.messages as unknown as BaseMessage[]) ?? []).find(
                    (message) => message.additional_kwargs && message.additional_kwargs?.nodeId === parsedValue.id
                )
                if (messageOutput) value = messageOutput.content
            }
        } catch (e) {
            // do nothing
        }
        transformedObject[key] = () => value
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
