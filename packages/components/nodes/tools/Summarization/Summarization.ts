import { BaseLanguageModel } from 'langchain/base_language'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { SummarizationTool as Summary } from './tool'
import { TextSplitter } from 'langchain/text_splitter'

class Summary_Tools implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'pdf文件处理'
        this.name = 'summarization'
        this.type = 'summarization'
        this.icon = 'chaintool.svg'
        this.category = 'Tools'
        this.description = 'pdf文件处理'
        this.baseClasses = [this.type, ...getBaseClasses(Summary)]
        this.inputs = [
            {
                label: 'Language Model',
                name: 'model',
                type: 'BaseLanguageModel'
            },
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter'
            },
            {
                label: '人设',
                name: 'systemMessage',
                type: 'string',
                rows: 4,
                optional: true,
                additionalParams: true
            },
            {
                label: '什么时候使用',
                name: 'description',
                type: 'string',
                rows: 3,
                placeholder:
                    'This tool specifically used for when you need to handle user uploaded file'
            },
            {
                label: 'Loader',
                name: 'loader',
                type: 'options',
                options: [
                    {
                        label: 'PDF loader',
                        name: 'pdf'
                    },
                    {
                        label: 'DOC loader',
                        name: 'docx'
                    }
                ],
                default: 'pdf'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as BaseLanguageModel
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const description = nodeData.inputs?.description as string
        const systemMessage = nodeData.inputs?.systemMessage as string

        const tool = new Summary({
            llm: model,
            description,
            systemMessage,
            splitter: textSplitter
        })

        return tool
    }
}

module.exports = { nodeClass: Summary_Tools }
