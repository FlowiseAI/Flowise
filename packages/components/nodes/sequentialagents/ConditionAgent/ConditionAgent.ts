import { uniq } from 'lodash'
import { DataSource } from 'typeorm'
import { z } from 'zod'
import { BaseMessagePromptTemplateLike, ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { RunnableSequence, RunnablePassthrough, RunnableConfig } from '@langchain/core/runnables'
import { BaseMessage } from '@langchain/core/messages'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
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
import { getInputVariables, getVars, handleEscapeCharacters, prepareSandboxVars } from '../../../src/utils'
import {
    ExtractTool,
    checkCondition,
    convertStructuredSchemaToZod,
    customGet,
    getVM,
    transformObjectPropertyToFunction,
    restructureMessages
} from '../commonUtils'
import { ChatGoogleGenerativeAI } from '../../chatmodels/ChatGoogleGenerativeAI/FlowiseChatGoogleGenerativeAI'

interface IConditionGridItem {
    variable: string
    operation: string
    value: string
    output: string
}

const examplePrompt = `You are an expert customer support routing system.
Your job is to detect whether a customer support representative is routing a user to the technical support team, or just responding conversationally.`

const exampleHumanPrompt = `The previous conversation is an interaction between a customer support representative and a user.
Extract whether the representative is routing the user to the technical support team, or just responding conversationally.

If representative want to route the user to the technical support team, respond only with the word "TECHNICAL".
Otherwise, respond only with the word "CONVERSATION".

Remember, only respond with one of the above words.`

const howToUseCode = `
1. Must return a string value at the end of function. For example:
    \`\`\`js
    if ("X" === "X") {
        return "Agent"; // connect to next agent node
    } else {
        return "End"; // connect to end node
    }
    \`\`\`

2. In most cases, you would probably get the last message to do some comparison. You can get all current messages from the state: \`$flow.state.messages\`:
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

    For example, to get the last message content:
    \`\`\`js
    const messages = $flow.state.messages;
    const lastMessage = messages[messages.length - 1];

    // Proceed to do something with the last message content
    \`\`\`

3. If you want to use the Condition Agent's output for conditional checks, it is available as \`$flow.output\` with the following structure:

    \`\`\`json
    {
        "content": 'Hello! How can I assist you today?',
        "name": "",
        "additional_kwargs": {},
        "response_metadata": {},
        "tool_calls": [],
        "invalid_tool_calls": [],
        "usage_metadata": {}
    }
    \`\`\`

    For example, we can check if the agent's output contains specific keyword:
    \`\`\`js
    const result = $flow.output.content;
    
    if (result.includes("some-keyword")) {
        return "Agent"; // connect to next agent node
    } else {
        return "End"; // connect to end node
    }
    \`\`\`

    If Structured Output is enabled, \`$flow.output\` will be in the JSON format as defined in the Structured Output configuration:
    \`\`\`json
    {
        "foo": 'var'
    }
    \`\`\`

4. You can get default flow config, including the current "state":
    - \`$flow.sessionId\`
    - \`$flow.chatId\`
    - \`$flow.chatflowId\`
    - \`$flow.input\`
    - \`$flow.state\`

5. You can get custom variables: \`$vars.<variable-name>\`

`

const defaultFunc = `const result = $flow.output.content;

if (result.includes("some-keyword")) {
    return "Agent";
}

return "End";
`

const TAB_IDENTIFIER = 'selectedConditionFunctionTab'

class ConditionAgent_SeqAgents implements INode {
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
    documentation?: string
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Condition Agent'
        this.name = 'seqConditionAgent'
        this.version = 2.0
        this.type = 'ConditionAgent'
        this.icon = 'condition.svg'
        this.category = 'Sequential Agents'
        this.description = 'Uses an agent to determine which route to take next'
        this.baseClasses = [this.type]
        this.documentation = 'https://docs.flowiseai.com/using-flowise/agentflows/sequential-agents#id-8.-conditional-agent-node'
        this.inputs = [
            {
                label: 'Name',
                name: 'conditionAgentName',
                type: 'string',
                placeholder: 'Condition Agent'
            },
            {
                label: 'Start | Agent | LLM | Tool Node',
                name: 'sequentialNode',
                type: 'Start | Agent | LLMNode | ToolNode',
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
                label: 'System Prompt',
                name: 'systemMessagePrompt',
                type: 'string',
                rows: 4,
                default: examplePrompt,
                additionalParams: true,
                optional: true
            },
            {
                label: 'Human Prompt',
                name: 'humanMessagePrompt',
                type: 'string',
                description: 'This prompt will be added at the end of the messages as human message',
                rows: 4,
                default: exampleHumanPrompt,
                additionalParams: true,
                optional: true
            },
            {
                label: 'Format Prompt Values',
                name: 'promptValues',
                description: 'Assign values to the prompt variables. You can also use $flow.state.<variable-name> to get the state value',
                type: 'json',
                optional: true,
                acceptVariable: true,
                list: true,
                additionalParams: true
            },
            {
                label: 'JSON Structured Output',
                name: 'conditionAgentStructuredOutput',
                type: 'datagrid',
                description: 'Instruct the LLM to give output in a JSON structured schema',
                datagrid: [
                    { field: 'key', headerName: 'Key', editable: true },
                    {
                        field: 'type',
                        headerName: 'Type',
                        type: 'singleSelect',
                        valueOptions: ['String', 'String Array', 'Number', 'Boolean', 'Enum'],
                        editable: true
                    },
                    { field: 'enumValues', headerName: 'Enum Values', editable: true },
                    { field: 'description', headerName: 'Description', flex: 1, editable: true }
                ],
                optional: true,
                additionalParams: true
            },
            {
                label: 'Condition',
                name: 'condition',
                type: 'conditionFunction', // This is a custom type to show as button on the UI and render anchor points when saved
                tabIdentifier: TAB_IDENTIFIER,
                tabs: [
                    {
                        label: 'Condition (Table)',
                        name: 'conditionUI',
                        type: 'datagrid',
                        description: 'If a condition is met, the node connected to the respective output will be executed',
                        optional: true,
                        datagrid: [
                            {
                                field: 'variable',
                                headerName: 'Variable',
                                type: 'freeSolo',
                                editable: true,
                                loadMethod: ['getPreviousMessages', 'loadStateKeys'],
                                valueOptions: [
                                    {
                                        label: 'Agent Output (string)',
                                        value: '$flow.output.content'
                                    },
                                    {
                                        label: `Agent's JSON Key Output (string)`,
                                        value: '$flow.output.<replace-with-key>'
                                    },
                                    {
                                        label: 'Total Messages (number)',
                                        value: '$flow.state.messages.length'
                                    },
                                    {
                                        label: 'First Message Content (string)',
                                        value: '$flow.state.messages[0].content'
                                    },
                                    {
                                        label: 'Last Message Content (string)',
                                        value: '$flow.state.messages[-1].content'
                                    },
                                    {
                                        label: `Global variable (string)`,
                                        value: '$vars.<variable-name>'
                                    }
                                ],
                                flex: 0.5,
                                minWidth: 200
                            },
                            {
                                field: 'operation',
                                headerName: 'Operation',
                                type: 'singleSelect',
                                valueOptions: [
                                    'Contains',
                                    'Not Contains',
                                    'Start With',
                                    'End With',
                                    'Is',
                                    'Is Not',
                                    'Is Empty',
                                    'Is Not Empty',
                                    'Greater Than',
                                    'Less Than',
                                    'Equal To',
                                    'Not Equal To',
                                    'Greater Than or Equal To',
                                    'Less Than or Equal To'
                                ],
                                editable: true,
                                flex: 0.4,
                                minWidth: 150
                            },
                            {
                                field: 'value',
                                headerName: 'Value',
                                flex: 1,
                                editable: true
                            },
                            {
                                field: 'output',
                                headerName: 'Output Name',
                                editable: true,
                                flex: 0.3,
                                minWidth: 150
                            }
                        ]
                    },
                    {
                        label: 'Condition (Code)',
                        name: 'conditionFunction',
                        type: 'code',
                        description: 'Function to evaluate the condition',
                        hint: {
                            label: 'How to use',
                            value: howToUseCode
                        },
                        hideCodeExecute: true,
                        codeExample: defaultFunc,
                        optional: true
                    }
                ]
            }
        ]
        this.outputs = [
            {
                label: 'Next',
                name: 'next',
                baseClasses: ['Condition'],
                isAnchor: true
            },
            {
                label: 'End',
                name: 'end',
                baseClasses: ['Condition'],
                isAnchor: true
            }
        ]
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const conditionLabel = nodeData.inputs?.conditionAgentName as string
        const conditionName = conditionLabel.toLowerCase().replace(/\s/g, '_').trim()
        const output = nodeData.outputs?.output as string
        const sequentialNodes = nodeData.inputs?.sequentialNode as ISeqAgentNode[]
        let agentPrompt = nodeData.inputs?.systemMessagePrompt as string
        let humanPrompt = nodeData.inputs?.humanMessagePrompt as string
        const promptValuesStr = nodeData.inputs?.promptValues
        const conditionAgentStructuredOutput = nodeData.inputs?.conditionAgentStructuredOutput
        const model = nodeData.inputs?.model as BaseChatModel

        if (!sequentialNodes || !sequentialNodes.length) throw new Error('Condition Agent must have a predecessor!')

        const startLLM = sequentialNodes[0].startLLM
        const llm = model || startLLM
        if (nodeData.inputs) nodeData.inputs.model = llm

        let conditionAgentInputVariablesValues: ICommonObject = {}
        if (promptValuesStr) {
            try {
                conditionAgentInputVariablesValues = typeof promptValuesStr === 'object' ? promptValuesStr : JSON.parse(promptValuesStr)
            } catch (exception) {
                throw new Error("Invalid JSON in the Condition Agent's Prompt Input Values: " + exception)
            }
        }
        conditionAgentInputVariablesValues = handleEscapeCharacters(conditionAgentInputVariablesValues, true)

        const conditionAgentInputVariables = uniq([...getInputVariables(agentPrompt), ...getInputVariables(humanPrompt)])

        if (!conditionAgentInputVariables.every((element) => Object.keys(conditionAgentInputVariablesValues).includes(element))) {
            throw new Error('Condition Agent input variables values are not provided!')
        }

        const abortControllerSignal = options.signal as AbortController

        const conditionalEdge = async (state: ISeqAgentsState, config: RunnableConfig) =>
            await runCondition(
                conditionName,
                nodeData,
                input,
                options,
                state,
                config,
                llm,
                agentPrompt,
                humanPrompt,
                conditionAgentInputVariablesValues,
                conditionAgentStructuredOutput,
                abortControllerSignal
            )

        const returnOutput: ISeqAgentNode = {
            id: nodeData.id,
            node: conditionalEdge,
            name: conditionName,
            label: conditionLabel,
            type: 'condition',
            output,
            llm,
            startLLM,
            multiModalMessageContent: sequentialNodes[0]?.multiModalMessageContent,
            predecessorAgents: sequentialNodes
        }

        return returnOutput
    }
}

const runCondition = async (
    conditionName: string,
    nodeData: INodeData,
    input: string,
    options: ICommonObject,
    state: ISeqAgentsState,
    config: RunnableConfig,
    llm: BaseChatModel,
    agentPrompt: string,
    humanPrompt: string,
    conditionAgentInputVariablesValues: ICommonObject,
    conditionAgentStructuredOutput: string,
    abortControllerSignal: AbortController
) => {
    const appDataSource = options.appDataSource as DataSource
    const databaseEntities = options.databaseEntities as IDatabaseEntity
    const tabIdentifier = nodeData.inputs?.[`${TAB_IDENTIFIER}_${nodeData.id}`] as string
    const conditionUI = nodeData.inputs?.conditionUI as string
    const conditionFunction = nodeData.inputs?.conditionFunction as string
    const selectedTab = tabIdentifier ? tabIdentifier.split(`_${nodeData.id}`)[0] : 'conditionUI'

    const promptArrays = [new MessagesPlaceholder('messages')] as BaseMessagePromptTemplateLike[]
    if (agentPrompt) promptArrays.unshift(['system', agentPrompt])
    if (humanPrompt) promptArrays.push(['human', humanPrompt])
    const prompt = ChatPromptTemplate.fromMessages(promptArrays)

    let model
    if (conditionAgentStructuredOutput && conditionAgentStructuredOutput !== '[]') {
        try {
            const structuredOutput = z.object(convertStructuredSchemaToZod(conditionAgentStructuredOutput))

            if (llm instanceof ChatGoogleGenerativeAI) {
                const tool = new ExtractTool({
                    schema: structuredOutput
                })
                // @ts-ignore
                const modelWithTool = llm.bind({
                    tools: [tool],
                    signal: abortControllerSignal ? abortControllerSignal.signal : undefined
                })
                model = modelWithTool
            } else {
                // @ts-ignore
                model = llm.withStructuredOutput(structuredOutput)
            }
        } catch (exception) {
            console.error('Invalid JSON in Condition Agent Structured Output: ' + exception)
            model = llm
        }
    } else {
        model = llm
    }

    let chain

    if (!conditionAgentInputVariablesValues || !Object.keys(conditionAgentInputVariablesValues).length) {
        chain = RunnableSequence.from([prompt, model]).withConfig({
            metadata: { sequentialNodeName: conditionName }
        })
    } else {
        chain = RunnableSequence.from([
            RunnablePassthrough.assign(transformObjectPropertyToFunction(conditionAgentInputVariablesValues, state)),
            prompt,
            model
        ]).withConfig({
            metadata: { sequentialNodeName: conditionName }
        })
    }

    // @ts-ignore
    state.messages = restructureMessages(model, state)

    let result = await chain.invoke({ ...state, signal: abortControllerSignal?.signal }, config)
    result.additional_kwargs = { ...result.additional_kwargs, nodeId: nodeData.id }

    if (conditionAgentStructuredOutput && conditionAgentStructuredOutput !== '[]' && result.tool_calls && result.tool_calls.length) {
        let jsonResult = {}
        for (const toolCall of result.tool_calls) {
            jsonResult = { ...jsonResult, ...toolCall.args }
        }
        result = { ...jsonResult, additional_kwargs: { nodeId: nodeData.id } }
    }

    const variables = await getVars(appDataSource, databaseEntities, nodeData)

    const flow = {
        chatflowId: options.chatflowid,
        sessionId: options.sessionId,
        chatId: options.chatId,
        input,
        state,
        output: result,
        vars: prepareSandboxVars(variables)
    }

    if (selectedTab === 'conditionFunction' && conditionFunction) {
        const vm = await getVM(appDataSource, databaseEntities, nodeData, flow)
        try {
            const response = await vm.run(`module.exports = async function() {${conditionFunction}}()`, __dirname)
            if (typeof response !== 'string') throw new Error('Condition function must return a string')
            return response
        } catch (e) {
            throw new Error(e)
        }
    } else if (selectedTab === 'conditionUI' && conditionUI) {
        try {
            const conditionItems: IConditionGridItem[] = typeof conditionUI === 'string' ? JSON.parse(conditionUI) : conditionUI

            for (const item of conditionItems) {
                if (!item.variable) throw new Error('Condition variable is required!')

                if (item.variable.startsWith('$flow')) {
                    const variableValue = customGet(flow, item.variable.replace('$flow.', ''))
                    if (checkCondition(variableValue, item.operation, item.value)) {
                        return item.output
                    }
                } else if (item.variable.startsWith('$vars')) {
                    const variableValue = customGet(flow, item.variable.replace('$', ''))
                    if (checkCondition(variableValue, item.operation, item.value)) {
                        return item.output
                    }
                } else if (item.variable.startsWith('$')) {
                    const nodeId = item.variable.replace('$', '')

                    const messageOutputs = ((state.messages as unknown as BaseMessage[]) ?? []).filter(
                        (message) => message.additional_kwargs && message.additional_kwargs?.nodeId === nodeId
                    )
                    const messageOutput = messageOutputs[messageOutputs.length - 1]

                    if (messageOutput) {
                        if (checkCondition(messageOutput.content as string, item.operation, item.value)) {
                            return item.output
                        }
                    }
                }
            }
            return 'End'
        } catch (exception) {
            throw new Error('Invalid Condition: ' + exception)
        }
    }
}

module.exports = { nodeClass: ConditionAgent_SeqAgents }
