import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } from 'langchain/prompts'

class ChatPromptTemplate_Prompts implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Chat Prompt Template'
        this.name = 'chatPromptTemplate'
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
                type: 'string',
                rows: 4,
                placeholder: `{text}`
            },
            {
                label: 'Format Prompt Values',
                name: 'promptValues',
                type: 'string',
                rows: 4,
                placeholder: `{
  "input_language": "English",
  "output_language": "French"
}`,
                optional: true,
                acceptVariable: true,
                list: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const systemMessagePrompt = nodeData.inputs?.systemMessagePrompt as string
        const humanMessagePrompt = nodeData.inputs?.humanMessagePrompt as string
        const promptValuesStr = nodeData.inputs?.promptValues as string

        const prompt = ChatPromptTemplate.fromPromptMessages([
            SystemMessagePromptTemplate.fromTemplate(systemMessagePrompt),
            HumanMessagePromptTemplate.fromTemplate(humanMessagePrompt)
        ])

        let promptValues: ICommonObject = {}
        if (promptValuesStr) {
            promptValues = JSON.parse(promptValuesStr.replace(/\s/g, ''))
        }
        // @ts-ignore
        prompt.promptValues = promptValues

        return prompt
    }
}

module.exports = { nodeClass: ChatPromptTemplate_Prompts }
