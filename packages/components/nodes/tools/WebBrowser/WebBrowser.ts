import { BaseLanguageModel } from '@langchain/core/language_models/base'
import { Embeddings } from '@langchain/core/embeddings'
import { WebBrowser } from 'langchain/tools/webbrowser'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'

class WebBrowser_Tools implements INode {
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
        this.label = 'Web Browser'
        this.name = 'webBrowser'
        this.version = 1.0
        this.type = 'WebBrowser'
        this.icon = 'webBrowser.svg'
        this.category = 'Tools'
        this.description = 'Gives agent the ability to visit a website and extract information'
        this.inputs = [
            {
                label: 'Language Model',
                name: 'model',
                type: 'BaseLanguageModel'
            },
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
            }
        ]
        this.baseClasses = [this.type, ...getBaseClasses(WebBrowser)]
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as BaseLanguageModel
        const embeddings = nodeData.inputs?.embeddings as Embeddings

        return new WebBrowser({ model, embeddings })
    }
}

module.exports = { nodeClass: WebBrowser_Tools }
