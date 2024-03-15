import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getInputVariables } from '../../../src/utils'
import { FewShotPromptTemplate, FewShotPromptTemplateInput, PromptTemplate, TemplateFormat } from '@langchain/core/prompts'
import type { Example } from '@langchain/core/prompts'

class FewShotPromptTemplate_Prompts implements INode {
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
        this.label = 'Few Shot Prompt Template'
        this.name = 'fewShotPromptTemplate'
        this.version = 1.0
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
                label: 'Example Separator',
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
        const examplesStr = nodeData.inputs?.examples
        const prefix = nodeData.inputs?.prefix as string
        const suffix = nodeData.inputs?.suffix as string
        const exampleSeparator = nodeData.inputs?.exampleSeparator as string
        const templateFormat = nodeData.inputs?.templateFormat as TemplateFormat
        const examplePrompt = nodeData.inputs?.examplePrompt as PromptTemplate

        const inputVariables = getInputVariables(suffix)

        let examples: Example[] = []
        if (examplesStr) {
            try {
                examples = typeof examplesStr === 'object' ? examplesStr : JSON.parse(examplesStr)
            } catch (exception) {
                throw new Error("Invalid JSON in the FewShotPromptTemplate's examples: " + exception)
            }
        }

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
