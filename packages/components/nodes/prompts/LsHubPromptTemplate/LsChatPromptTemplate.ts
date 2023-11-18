import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } from 'langchain/prompts'

class LsHubChatPromptTemplate_Prompts implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams
    constructor() {
        this.label = 'Load Chat Prompt from Langsmith Hub'
        this.name = 'lsChatPromptTemplate'
        this.version = 1.0
        this.type = 'LsChatPromptTemplate'
        this.icon = 'prompt.svg'
        this.category = 'Prompts'
        this.description = 'Schema to represent a chat prompt'
        this.baseClasses = [this.type, ...getBaseClasses(ChatPromptTemplate)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            optional: true,
            credentialNames: ['langsmithApi']
        }
        this.inputs = [
            {
                label: 'Tag',
                name: 'promptName',
                type: 'promptLookup',
                description: 'Use the format {owner}/{repo}:{commit}. If no commit is specified, the latest commit will be used.',
                placeholder: 'hwchase17/my-first-prompt'
            },
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
                type: 'json',
                optional: true,
                acceptVariable: true,
                list: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const systemMessagePrompt = nodeData.inputs?.systemMessagePrompt as string
        const humanMessagePrompt = nodeData.inputs?.humanMessagePrompt as string
        const promptValuesStr = nodeData.inputs?.promptValues

        const prompt = ChatPromptTemplate.fromMessages([
            SystemMessagePromptTemplate.fromTemplate(systemMessagePrompt),
            HumanMessagePromptTemplate.fromTemplate(humanMessagePrompt)
        ])

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

module.exports = { nodeClass: LsHubChatPromptTemplate_Prompts }
