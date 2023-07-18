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
]`,
                description: 'These are the examples we want to insert into the prompt.'
            },
            {
                label: 'Example Prompt',
                name: 'examplePrompt',
                type: 'PromptTemplate',
                description: 'This is how we want to format the examples when we insert them into the prompt.'
            },
            {
                label: 'Prefix',
                name: 'prefix',
                type: 'string',
                rows: 4,
                placeholder: `Give the antonym of every input`,
                description: 'The prefix is some text that goes before the examples in the prompt. Usually, this consists of instructions.'
            },
            {
                label: 'Suffix',
                name: 'suffix',
                type: 'string',
                rows: 4,
                placeholder: `Word: {input}\nAntonym:`,
                description:
                    'The suffix is some text that goes after the examples in the prompt. Usually, this is where the user input will go'
            },
            {
                label: 'Example Seperator',
                name: 'exampleSeparator',
                type: 'string',
                placeholder: `\n\n`,
                description: 'The example separator is the string we will use to join the prefix, examples, and suffix together with.'
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
                default: `f-string`,
                description: 'The template format is the formatting method to use for the template. Should usually be f-string.'
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
        const examples: Example[] = JSON.parse(examplesStr)

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
