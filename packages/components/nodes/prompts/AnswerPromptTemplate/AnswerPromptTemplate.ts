/**
 * AnswerPromptTemplate Node
 *
 * This node is a fork of the ChatPromptTemplate, designed to enable advanced prompt customization for chat-based workflows.
 *
 * Purpose:
 * - Provides a schema for answer prompts with support for system, human, and example messages.
 * - Allows advanced customization, including few-shot examples and dynamic prompt values.
 * - Serves as the foundation for future personalization (e.g., user variables, dynamic context).
 *
 * Usage:
 * - Use this node in chat flows where you need more control over prompt structure and content.
 * - Supports code-based message history for few-shot learning and advanced scenarios.
 *
 * Extension Guidance:
 * - To add new features (e.g., user variables, context injection), extend the inputs array and update the init logic.
 * - Keep all comments and documentation in English.
 * - Follow the pattern of composability and clear separation of message types.
 *
 * For more details, see the team documentation on prompt engineering and chat flow design.
 */
import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, transformBracesWithColon } from '../../../src/utils'
import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts'
import { getVM } from '../../sequentialagents/commonUtils'
import { DataSource } from 'typeorm'
const defaultFunc = `const { AIMessage, HumanMessage, ToolMessage } = require('@langchain/core/messages');

return [
    new HumanMessage("What is 333382 🦜 1932?"),
    new AIMessage({
        content: "",
        tool_calls: [
        {
            id: "12345",
            name: "calulator",
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

class AnswerPromptTemplate_Prompts implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    tags: string[]

    constructor() {
        this.label = 'Answer Prompt Template'
        this.name = 'answerPromptTemplate'
        this.version = 1.0
        this.type = 'ChatPromptTemplate'
        this.icon = 'prompt.svg'
        this.category = 'Prompts'
        this.tags = ['AAI']
        this.description = 'Schema to represent an answer prompt for advanced customization'
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
            const vm = await getVM(appDataSource, databaseEntities, nodeData, {})
            try {
                const response = await vm.run(`module.exports = async function() {${messageHistoryCode}}()`, __dirname)
                if (!Array.isArray(response)) throw new Error('Returned message history must be an array')
                prompt = ChatPromptTemplate.fromMessages([
                    SystemMessagePromptTemplate.fromTemplate(systemMessagePrompt),
                    ...response,
                    HumanMessagePromptTemplate.fromTemplate(humanMessagePrompt)
                ])
            } catch (e) {
                throw new Error(e)
            }
        }

        let promptValues: ICommonObject = {}
        if (promptValuesStr) {
            try {
                const sanitizedPromptValuesStr = promptValuesStr.replace(/\n/g, '\\n') // Replace newlines with escaped newlines we might want a helper function for this
                promptValues =
                    typeof sanitizedPromptValuesStr === 'object' ? sanitizedPromptValuesStr : JSON.parse(sanitizedPromptValuesStr)
            } catch (exception) {
                throw new Error("Invalid JSON in the AnswerPromptTemplate's promptValues: " + exception)
            }
        }
        // @ts-ignore
        prompt.promptValues = promptValues

        return prompt
    }
}

module.exports = { nodeClass: AnswerPromptTemplate_Prompts } 