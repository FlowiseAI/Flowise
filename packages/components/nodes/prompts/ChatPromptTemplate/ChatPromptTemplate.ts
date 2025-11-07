import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, transformBracesWithColon, getVars, executeJavaScriptCode, createCodeExecutionSandbox } from '../../../src/utils'
import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts'
import { DataSource } from 'typeorm'
const defaultFunc = `const { AIMessage, HumanMessage, ToolMessage } = require('@langchain/core/messages');

return [
    new HumanMessage("What is 333382 🦜 1932?"),
    new AIMessage({
        content: "",
        tool_calls: [
        {
            id: "12345",
            name: "calculator",
            args: {
                number1: 333382,
                number2: 1932,
                operation: "divide",
            },
        },
        ],
    }),
    new ToolMessage({
        tool_call_id: "12345",
        content: "The answer is 172.558.",
    }),
    new AIMessage("The answer is 172.558."),
]`
const TAB_IDENTIFIER = 'selectedMessagesTab'

class ChatPromptTemplate_Prompts implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Chat Prompt Template'
        this.name = 'chatPromptTemplate'
        this.version = 2.0
        this.type = 'ChatPromptTemplate'
        this.icon = 'prompt.svg'
        this.category = 'Prompts'
        this.description = 'Schema to represent a chat prompt'
        this.baseClasses = [this.type, ...getBaseClasses(ChatPromptTemplate)]
        this.inputs = [
            {
                label: 'System Message',
                name: 'systemMessagePrompt',
                type: 'string',
                rows: 4,
                placeholder: `You are a helpful assistant that translates {input_language} to {output_language}.`
            },
            {
                label: 'Human Message',
                name: 'humanMessagePrompt',
                description: 'This prompt will be added at the end of the messages as human message',
                type: 'string',
                rows: 4,
                placeholder: `{text}`
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
                label: 'Messages History',
                name: 'messageHistory',
                description: 'Add messages after System Message. This is useful when you want to provide few shot examples',
                type: 'tabs',
                tabIdentifier: TAB_IDENTIFIER,
                additionalParams: true,
                default: 'messageHistoryCode',
                tabs: [
                    //TODO: add UI for messageHistory
                    {
                        label: 'Add Messages (Code)',
                        name: 'messageHistoryCode',
                        type: 'code',
                        hideCodeExecute: true,
                        codeExample: defaultFunc,
                        optional: true,
                        additionalParams: true
                    }
                ]
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        let systemMessagePrompt = nodeData.inputs?.systemMessagePrompt as string
        let humanMessagePrompt = nodeData.inputs?.humanMessagePrompt as string
        const promptValuesStr = nodeData.inputs?.promptValues
        const tabIdentifier = nodeData.inputs?.[`${TAB_IDENTIFIER}_${nodeData.id}`] as string
        const selectedTab = tabIdentifier ? tabIdentifier.split(`_${nodeData.id}`)[0] : 'messageHistoryCode'
        const messageHistoryCode = nodeData.inputs?.messageHistoryCode
        const messageHistory = nodeData.inputs?.messageHistory

        systemMessagePrompt = transformBracesWithColon(systemMessagePrompt)
        humanMessagePrompt = transformBracesWithColon(humanMessagePrompt)

        let prompt = ChatPromptTemplate.fromMessages([
            SystemMessagePromptTemplate.fromTemplate(systemMessagePrompt),
            HumanMessagePromptTemplate.fromTemplate(humanMessagePrompt)
        ])

        if (
            (messageHistory && messageHistory === 'messageHistoryCode' && messageHistoryCode) ||
            (selectedTab === 'messageHistoryCode' && messageHistoryCode)
        ) {
            const appDataSource = options.appDataSource as DataSource
            const databaseEntities = options.databaseEntities as IDatabaseEntity
            const variables = await getVars(appDataSource, databaseEntities, nodeData, options)
            const flow = {
                chatflowId: options.chatflowid,
                sessionId: options.sessionId,
                chatId: options.chatId
            }

            const sandbox = createCodeExecutionSandbox('', variables, flow)

            try {
                const response = await executeJavaScriptCode(messageHistoryCode, sandbox, {
                    libraries: ['axios', '@langchain/core']
                })

                const parsedResponse = JSON.parse(response)

                if (!Array.isArray(parsedResponse)) {
                    throw new Error('Returned message history must be an array')
                }
                prompt = ChatPromptTemplate.fromMessages([
                    SystemMessagePromptTemplate.fromTemplate(systemMessagePrompt),
                    ...parsedResponse,
                    HumanMessagePromptTemplate.fromTemplate(humanMessagePrompt)
                ])
            } catch (e) {
                throw new Error(e)
            }
        }

        let promptValues: ICommonObject = {}
        if (promptValuesStr) {
            try {
                promptValues = typeof promptValuesStr === 'object' ? promptValuesStr : JSON.parse(promptValuesStr)
            } catch (exception) {
                throw new Error("Invalid JSON in the ChatPromptTemplate's promptValues: " + exception)
            }
        }
        // @ts-ignore
        prompt.promptValues = promptValues

        return prompt
    }
}

module.exports = { nodeClass: ChatPromptTemplate_Prompts }
