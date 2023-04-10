import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getInputVariables } from '../../../src/utils'

class FewShotPromptTemplate_Prompts implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Few Shot Prompt Template'
        this.name = 'fewShotPromptTemplate'
        this.type = 'FewShotPromptTemplate'
        this.icon = 'prompt.svg'
        this.category = 'Prompts'
        this.description = 'Prompt template you can build with examples'
        this.inputs = [
            {
                label: 'Examples',
                name: 'examples',
                type: 'string',
                rows: 5,
                placeholder: `[
  { "word": "happy", "antonym": "sad" },
  { "word": "tall", "antonym": "short" },
]`
            },
            {
                label: 'Example Prompt',
                name: 'examplePrompt',
                type: 'BasePromptTemplate'
            },
            {
                label: 'Prefix',
                name: 'prefix',
                type: 'string',
                rows: 3,
                placeholder: `Give the antonym of every input`
            },
            {
                label: 'Suffix',
                name: 'suffix',
                type: 'string',
                rows: 3,
                placeholder: `Word: {input}\nAntonym:`
            },
            {
                label: 'Example Seperator',
                name: 'exampleSeparator',
                type: 'string',
                placeholder: `\n\n`
            },
            {
                label: 'Template Format',
                name: 'templateFormat',
                type: 'options',
                options: [
                    {
                        label: 'f-string',
                        name: 'f-string'
                    },
                    {
                        label: 'jinja-2',
                        name: 'jinja-2'
                    }
                ],
                default: `f-string`
            }
        ]
    }

    async getBaseClasses(): Promise<string[]> {
        const { FewShotPromptTemplate } = await import('langchain/prompts')
        return getBaseClasses(FewShotPromptTemplate)
    }

    async init(nodeData: INodeData): Promise<any> {
        const { FewShotPromptTemplate } = await import('langchain/prompts')

        const examplesStr = nodeData.inputs?.examples as string

        const prefix = nodeData.inputs?.prefix as string
        const suffix = nodeData.inputs?.suffix as string
        const exampleSeparator = nodeData.inputs?.exampleSeparator as string
        const templateFormat = nodeData.inputs?.templateFormat
        const examplePrompt = nodeData.inputs?.examplePrompt

        const inputVariables = getInputVariables(suffix)
        const examples = JSON.parse(examplesStr.replace(/\s/g, ''))

        try {
            const prompt = new FewShotPromptTemplate({
                examples,
                examplePrompt,
                prefix,
                suffix,
                inputVariables,
                exampleSeparator,
                templateFormat
            })
            return prompt
        } catch (e) {
            throw new Error(e)
        }
    }
}

module.exports = { nodeClass: FewShotPromptTemplate_Prompts }
