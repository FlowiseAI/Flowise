import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../../src/utils'
import { MCPToolkit } from '../core'

class UnstructuredMCP implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    documentation: string
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Unstructured MCP'
        this.name = 'unstructuredMCP'
        this.version = 1.0
        this.type = 'Unstructured MCP Tool'
        this.icon = 'unstructured.png'
        this.category = 'Tools (MCP)'
        this.description =
            'MCP Server for Unstructured.io — parse PDFs, DOCX, PPTX, images and 60+ other file types into clean markdown or structured JSON'
        this.documentation = 'https://docs.unstructured.io/transform/overview'
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['unstructuredTransformApi']
        }
        this.inputs = [
            {
                label: 'Available Actions',
                name: 'mcpActions',
                type: 'asyncMultiOptions',
                loadMethod: 'listActions',
                refresh: true
            }
        ]
        this.baseClasses = ['Tool']
    }

    loadMethods = {
        listActions: async (nodeData: INodeData, options: ICommonObject = {}): Promise<INodeOptionsValue[]> => {
            try {
                const toolset = await this.getTools(nodeData, options)
                toolset.sort((a: any, b: any) => a.name.localeCompare(b.name))

                return toolset.map(({ name, ...rest }) => ({
                    label: name.toUpperCase(),
                    name: name,
                    description: rest.description || name
                }))
            } catch (error) {
                console.error('Error listing actions:', error)
                return [
                    {
                        label: 'No Available Actions',
                        name: 'error',
                        description: 'No available actions, please check your Unstructured.io Transform API Key and refresh'
                    }
                ]
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject = {}): Promise<any> {
        const tools = await this.getTools(nodeData, options)

        const _mcpActions = nodeData.inputs?.mcpActions
        let mcpActions: string[] = []
        if (_mcpActions) {
            const parsed = typeof _mcpActions === 'string' ? JSON.parse(_mcpActions) : _mcpActions
            if (!Array.isArray(parsed)) {
                throw new Error('mcpActions must be an array')
            }
            mcpActions = parsed
        }

        return tools.filter((tool: any) => mcpActions.includes(tool.name))
    }

    async getTools(nodeData: INodeData, options: ICommonObject = {}): Promise<Tool[]> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('unstructuredTransformAPIKey', credentialData, nodeData)

        const url = 'https://mcp.transform.unstructured.io/'

        if (!apiKey) {
            throw new Error('Missing Unstructured.io Transform API Key')
        }

        const serverParams = {
            type: 'http',
            url,
            headers: {
                Authorization: `Bearer ${apiKey}`
            }
        }

        const toolkit = new MCPToolkit(serverParams, 'http')
        await toolkit.initialize()

        const tools = toolkit.tools ?? []

        return tools as Tool[]
    }
}

module.exports = { nodeClass: UnstructuredMCP }
