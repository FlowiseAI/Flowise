import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { DynamicTool } from '@langchain/core/tools'
import axios from 'axios'

class ComposioTool implements INode {
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
        this.label = 'Composio Tool'
        this.name = 'composioTool'
        this.version = 1.0
        this.type = 'ComposioTool'
        this.icon = 'composio.svg'
        this.category = 'Tools'
        this.description = 'Execute Composio API actions as tools'
        this.baseClasses = [this.type, ...getBaseClasses(DynamicTool)]
        this.inputs = [
            {
                label: 'Composio API Key',
                name: 'composioApiKey',
                type: 'password',
                description: 'Your Composio API Key'
            },
            {
                label: 'Tool Name',
                name: 'toolName',
                type: 'string',
                placeholder: 'gmail_send_email',
                description: 'Name of the tool (e.g., gmail_send_email, notion_create_page)'
            },
            {
                label: 'Tool Description',
                name: 'toolDescription',
                type: 'string',
                rows: 3,
                placeholder: 'Use this tool to send an email via Gmail',
                description: 'Description of what the tool does and when to use it'
            },
            {
                label: 'Required Parameters',
                name: 'requiredParams',
                type: 'json',
                placeholder: '["to", "subject", "body"]',
                description: 'List of required parameters for this tool'
            },
            {
                label: 'Optional Parameters',
                name: 'optionalParams',
                type: 'json',
                placeholder: '["cc", "bcc"]',
                description: 'List of optional parameters for this tool',
                optional: true
            },
            {
                label: 'Parameter Descriptions',
                name: 'paramDescriptions',
                type: 'json',
                placeholder: '{"to": "Email recipient", "subject": "Email subject", "body": "Email body content"}',
                description: 'Descriptions for each parameter',
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const composioApiKey = nodeData.inputs?.composioApiKey as string
        const toolName = nodeData.inputs?.toolName as string
        const toolDescription = nodeData.inputs?.toolDescription as string
        const requiredParams = nodeData.inputs?.requiredParams
            ? JSON.parse(nodeData.inputs.requiredParams as string)
            : []
        const optionalParams = nodeData.inputs?.optionalParams
            ? JSON.parse(nodeData.inputs.optionalParams as string)
            : []
        const paramDescriptions = nodeData.inputs?.paramDescriptions
            ? JSON.parse(nodeData.inputs.paramDescriptions as string)
            : {}

        // Create parameter schema for the tool
        const schema: Record<string, any> = {
            type: 'object',
            properties: {},
            required: requiredParams
        }

        // Add all parameters to the schema
        const allParams = [...requiredParams, ...optionalParams]
        for (const param of allParams) {
            schema.properties[param] = {
                type: 'string',
                description: paramDescriptions[param] || `Parameter: ${param}`
            }
        }

        // Create the dynamic tool
        const tool = new DynamicTool({
            name: toolName,
            description: toolDescription,
            func: async (input: string) => {
                    const parsedInput: Record<string, any> = JSON.parse(input);
                try {
                    // Call Composio API
                    const response = await axios.post(
                        `https://api.composio.dev/v1/tools/${toolName}/execute`,
                        parsedInput,
                        {
                            headers: {
                                'Authorization': `Bearer ${composioApiKey}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    )
                    
                    // Return the result
                    return JSON.stringify(response.data)
                } catch (error) {
                    if (axios.isAxiosError(error) && error.response) {
                        return `Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
                    }
                    return `Error executing Composio tool: ${error}`
                }
            }
        })

        return tool
    }
}

module.exports = { nodeClass: ComposioTool }