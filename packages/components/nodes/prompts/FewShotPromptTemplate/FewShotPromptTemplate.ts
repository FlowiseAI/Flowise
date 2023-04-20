import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getInputVariables } from '../../../src/utils'
import { FewShotPromptTemplate, FewShotPromptTemplateInput, PromptTemplate } from 'langchain/prompts'
import { Example } from 'langchain/schema'
import { TemplateFormat } from 'langchain/dist/prompts/template'

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
        this.baseClasses = [this.type, ...getBaseClasses(FewShotPromptTemplate)]
        this.inputs = [
            {
                label: 'Examples',
                name: 'examples',
                type: 'string',
                rows: 4,
                placeholder: `[
  { "word": "happy", "antonym": "sad" },
  { "word": "tall", "antonym": "short" },
]`
            },
            {
                label: 'Example Prompt',
                name: 'examplePrompt',
                type: 'PromptTemplate'
            },
            {
                label: 'Prefix',
                name: 'prefix',
                type: 'string',
                rows: 4,
                placeholder: `Give the antonym of every input`
            },
            {
                label: 'Suffix',
                name: 'suffix',
                type: 'string',
                rows: 4,
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

    async init(nodeData: INodeData): Promise<any> {
        const examplesStr = nodeData.inputs?.examples as string
        const prefix = nodeData.inputs?.prefix as string
        const suffix = nodeData.inputs?.suffix as string
        const exampleSeparator = nodeData.inputs?.exampleSeparator as string
        const templateFormat = nodeData.inputs?.templateFormat as TemplateFormat
        const examplePrompt = nodeData.inputs?.examplePrompt as PromptTemplate

        const inputVariables = getInputVariables(suffix)
        const examples: Example[] = JSON.parse(examplesStr.replace(/\s/g, ''))

        try {
            const obj: FewShotPromptTemplateInput = {
                examples,
                examplePrompt,
                prefix,
                suffix,
                inputVariables,
                exampleSeparator,
                templateFormat
            }
            const prompt = new FewShotPromptTemplate(obj)
            return prompt
        } catch (e) {
            throw new Error(e)
        }
    }
}

module.exports = { nodeClass: FewShotPromptTemplate_Prompts }
