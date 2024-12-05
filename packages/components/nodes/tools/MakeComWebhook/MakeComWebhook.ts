import { DataSource } from 'typeorm'
import { ICommonObject, INode, INodeData, INodeParams, INodeOptionsValue, IDatabaseEntity } from '../../../src/Interface'
import { getBaseClasses, getCredentialData } from '../../../src/utils'
import { Tool } from '@langchain/core/tools'
import { z } from 'zod'

export class MakeComWebhookTool extends Tool {
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
        this.icon = 'makecom.svg'
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
                            Authorization: `Token ${this.apiKey}`,
                            'Content-Type': 'application/json',
                            Accept: 'application/json'
                        },
                        body: JSON.stringify(params)
                    })

                    const result = await response.json()
                    return result
                })
            )

            return JSON.stringify(responses)
        } catch (error) {
            return `Error executing MakeComWebhook webhook: ${error}`
        }
    }
}

class MakeComWebhook_Tools implements INode {
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
        this.label = 'MakeComWebhook'
        this.name = 'makeComWebhook'
        this.version = 1.0
        this.type = 'MakeComWebhook'
        this.icon = 'makecom.svg'
        this.category = 'Tools'
        this.description = 'Execute MakeComWebhook webhook triggers'
        this.baseClasses = [this.type, ...getBaseClasses(MakeComWebhookTool)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['makeComApi']
        }
        this.inputs = [
            {
                label: 'Select Webhook',
                name: 'webhook',
                type: 'asyncOptions',
                loadMethod: 'listWebhooks',
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

    private async getCredData(
        nodeData: INodeData,
        options: ICommonObject
    ): Promise<{ apiUrl: string; apiKey: string; teamId: string; organizationId: string } | null> {
        if (nodeData === undefined || !nodeData?.credential) {
            console.warn('nodeData or nodeData.credential is missing')
            return null
        }

        if (options === undefined || !options) {
            console.warn('options object is missing')
            return null
        }

        const appDataSource = options?.appDataSource as DataSource
        if (appDataSource === undefined || !appDataSource) {
            console.warn('appDataSource is missing in options')
            return null
        }

        const databaseEntities = options?.databaseEntities as IDatabaseEntity
        if (databaseEntities === undefined || !databaseEntities) {
            console.warn('databaseEntities is missing in options')
            return null
        }

        const credentialData: any = await getCredentialData(nodeData?.credential ?? '', options)

        if (!credentialData) {
            console.warn('Failed to retrieve credentialData')
            return null
        }

        const { apiUrl, apiKey, teamId, organizationId } = credentialData

        if (!apiUrl || !apiKey) {
            console.warn('API URL or API Key is missing in credentialData')
            return null
        }

        if (!teamId && !organizationId) {
            console.warn('Either Team ID or Organization ID must be provided in credentialData')
            return null
        }

        return { apiUrl, apiKey, teamId, organizationId }
    }

    //@ts-ignore
    loadMethods = {
        listWebhooks: async (nodeData: INodeData, options?: ICommonObject): Promise<INodeOptionsValue[]> => {
            const returnData: INodeOptionsValue[] = []

            const credentialData = await this.getCredData(nodeData, options ?? {})
            if (!credentialData) {
                return returnData
            }

            const { apiUrl, apiKey, teamId, organizationId } = credentialData

            let url = `${apiUrl}/api/v2/hooks?typeName=gateway-webhook&assigned=true`

            if (teamId) {
                url = `${url}&teamId=${teamId}`
            } else if (organizationId) {
                url = `${url}&organizationId=${organizationId}`
            } else {
                console.warn(`Neither Team ID or Organization ID were found.`)
                return returnData
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    Authorization: `Token ${apiKey}`,
                    Accept: 'application/json'
                }
            })

            if (!response.ok) {
                console.warn(`HTTP error! status: ${response.status}`)
                return returnData
            }

            const data = await response.json()

            if (!!data && Array.isArray(data.hooks)) {
                return data.hooks
                    .filter((hook: any) => hook.enabled)
                    .map((hook: any) => ({
                        label: hook.name || 'Unnamed Scenario',
                        name: hook.url.toString() || '',
                        description: hook.packageName
                    }))
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

        const selectedHook = nodeData.inputs?.webhook as string
        const toolName = (nodeData.inputs?.toolName as string) || 'make_com_webhook'
        const toolDescription = (nodeData.inputs?.toolDescription as string) || 'Execute MakeCom webhook'
        const schemaStr = (nodeData.inputs?.schema as string) || 'z.object({})'

        if (!selectedHook) {
            //}) || !selectedHook?.id) {
            console.warn('No Webhook Selected')
            throw new Error('Please select a webhook')
        }

        const webhookUrls = [selectedHook]

        // Convert schema string to Zod object
        const zodSchemaFunction = new Function('z', `return ${schemaStr}`)
        const schema = zodSchemaFunction(z)

        return new MakeComWebhookTool(toolName, toolDescription, apiUrl, apiKey, webhookUrls, schema)
    }
}

module.exports = { nodeClass: MakeComWebhook_Tools }
