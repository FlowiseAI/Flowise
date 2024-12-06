import { DataSource } from 'typeorm'
import { ICommonObject, INode, INodeData, INodeParams, INodeOptionsValue, IDatabaseEntity } from '../../../src/Interface'
import { getBaseClasses, getCredentialData } from '../../../src/utils'
import { Tool } from '@langchain/core/tools'
import { z } from 'zod'

export class N8nTool extends Tool {
    name: string
    description: string
    apiUrl: string
    apiKey: string
    icon: string
    webhookUrls: string[]
    schema: any

    constructor(name: string, description: string, apiUrl: string, apiKey: string, webhookUrls: string[], schema: any) {
        super()
        this.name = name
        this.description = description
        this.apiUrl = apiUrl
        this.apiKey = apiKey
        this.icon = 'N8n.svg'
        this.webhookUrls = webhookUrls
        this.schema = schema
    }

    async _call(input: any): Promise<string> {
        try {
            let params = {}
            try {
                params = input
            } catch (error) {
                return 'Error: Input must be a valid JSON string'
            }

            const responses = await Promise.all(
                this.webhookUrls.map(async (url) => {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(params)
                    })

                    const result = await response.json()
                    return result
                })
            )

            return JSON.stringify(responses)
        } catch (error) {
            return `Error executing N8N workflow: ${error}`
        }
    }
}

class N8n_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'N8n'
        this.name = 'n8n'
        this.version = 1.0
        this.type = 'N8n'
        this.icon = 'n8n.svg'
        this.category = 'Tools'
        this.description = 'Execute N8N workflows using webhook triggers'
        this.baseClasses = [this.type, ...getBaseClasses(N8nTool)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['n8nApi']
        }
        this.inputs = [
            {
                label: 'Select Workflow',
                name: 'workflow',
                type: 'asyncOptions',
                loadMethod: 'listWorkflows',
                default: ''
            },
            {
                label: 'Tool Name',
                name: 'toolName',
                type: 'string',
                description: 'Name of the tool'
            },
            {
                label: 'Tool Description',
                name: 'toolDescription',
                type: 'string',
                description: 'Description of the tool'
            },
            {
                label: 'Parameters Schema',
                name: 'schema',
                type: 'code',
                description: 'Zod schema for the tool parameters (e.g., z.object({ param1: z.string() }))',
                default: 'z.object({})'
            }
        ]
    }

    private async getCredData(nodeData: INodeData, options: ICommonObject): Promise<{ apiUrl: string; apiKey: string } | null> {
        if (nodeData === undefined || !nodeData?.credential) {
            console.warn('Warning: nodeData or nodeData.credential is missing.')
            return null
        }

        if (options === undefined || !options) {
            console.warn('Warning: options parameter is missing.')
            return null
        }

        const appDataSource = options?.appDataSource as DataSource
        if (appDataSource === undefined || !appDataSource) {
            console.warn('Warning: appDataSource is missing in options.')
            return null
        }

        const databaseEntities = options?.databaseEntities as IDatabaseEntity
        if (databaseEntities === undefined || !databaseEntities) {
            console.warn('Warning: databaseEntities are missing in options.')
            return null
        }

        const credentialData: any = await getCredentialData(nodeData?.credential ?? '', options)

        if (!credentialData) {
            console.warn('Warning: Failed to retrieve credential data.')
            return null
        }

        const { apiUrl, apiKey } = credentialData

        if (!apiUrl || !apiKey) {
            console.warn('Warning: API URL or API Key is missing in credential data.')
            return null
        }

        return { apiUrl, apiKey }
    }

    //@ts-ignore
    loadMethods = {
        listWorkflows: async (nodeData: INodeData, options?: ICommonObject): Promise<INodeOptionsValue[]> => {
            const returnData: INodeOptionsValue[] = []

            const credentialData = await this.getCredData(nodeData, options ?? {})
            if (!credentialData) {
                return returnData
            }

            const { apiUrl, apiKey } = credentialData

            const url = `${apiUrl}/api/v1/workflows`

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-N8N-API-KEY': apiKey,
                    Accept: 'application/json'
                }
            })

            if (!response.ok) {
                console.warn(`HTTP error! status: ${response.status}`)
                return returnData
            }

            const data = await response.json()

            if (!!data && Array.isArray(data.data)) {
                return data.data
                    .map((workflow: any) => ({
                        label: workflow.name || 'Unnamed Workflow',
                        name: workflow.id || '',
                        description: workflow.active ? 'Active' : 'Inactive'
                    }))
                    .filter((option: INodeOptionsValue) => option.name !== '')
            }

            return returnData
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await this.getCredData(nodeData, options)
        if (!credentialData) {
            throw new Error('Failed to retrieve credentials')
        }

        const { apiUrl, apiKey } = credentialData
        const selectedWorkflow = nodeData.inputs?.workflow as string
        const toolName = (nodeData.inputs?.toolName as string) || 'N8N Workflow'
        const toolDescription = (nodeData.inputs?.toolDescription as string) || 'Execute N8N workflow'
        const schemaStr = (nodeData.inputs?.schema as string) || 'z.object({})'

        if (!selectedWorkflow) {
            console.warn('No Workflow Selected')
            throw new Error('Please select a workflow')
        }

        const workflowUrl = `${apiUrl}/api/v1/workflows/${selectedWorkflow}`

        // Fetch the selected workflow details
        const workflowResponse = await fetch(workflowUrl, {
            method: 'GET',
            headers: {
                'X-N8N-API-KEY': apiKey,
                Accept: 'application/json'
            }
        })

        if (!workflowResponse.ok) {
            throw new Error(`Failed to fetch workflow details: ${workflowResponse.statusText}`)
        }

        const workflowData = await workflowResponse.json()

        // Extract webhook nodes
        const webhookNodes = workflowData.nodes.filter((node: any) => node.type === 'n8n-nodes-base.webhook')

        if (!webhookNodes?.length) {
            throw new Error('No webhook nodes found in the selected workflow')
        }

        // Construct webhook URLs
        const webhookUrls = webhookNodes.map((node: any) => {
            const path = node.parameters.path
            return `${apiUrl}/webhook/${path}`
        })

        // Convert schema string to Zod object
        const zodSchemaFunction = new Function('z', `return ${schemaStr}`)
        const schema = zodSchemaFunction(z)

        return new N8nTool(toolName, toolDescription, apiUrl, apiKey, webhookUrls, schema)
    }
}

module.exports = { nodeClass: N8n_Tools }
