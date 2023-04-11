import { INode, INodeData, INodeParams } from '../../../src/Interface'

class AIPlugin implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs?: INodeParams[]

    constructor() {
        this.label = 'AI Plugin'
        this.name = 'aiPlugin'
        this.type = 'AIPlugin'
        this.icon = 'aiplugin.svg'
        this.category = 'Tools'
        this.description = 'Execute actions using ChatGPT Plugin Url'
        this.inputs = [
            {
                label: 'Plugin Url',
                name: 'pluginUrl',
                type: 'string',
                placeholder: 'https://www.klarna.com/.well-known/ai-plugin.json'
            }
        ]
    }

    async getBaseClasses(): Promise<string[]> {
        return ['Tool']
    }

    async init(nodeData: INodeData): Promise<any> {
        const { AIPluginTool } = await import('langchain/tools')
        const pluginUrl = nodeData.inputs?.pluginUrl as string

        const aiplugin = await AIPluginTool.fromPluginUrl(pluginUrl)
        return aiplugin
    }
}

module.exports = { nodeClass: AIPlugin }
