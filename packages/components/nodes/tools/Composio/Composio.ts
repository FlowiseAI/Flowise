import { Tool } from "@langchain/core/tools"
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { LangchainToolSet } from 'composio-core'

class ComposioTool extends Tool {
    name = "composio"
    description = "Tool for interacting with Composio applications and performing actions"
    toolset: any
    appName: string
    actions: string[]

    constructor(toolset: any, appName: string, actions: string[]) {
        super()
        this.toolset = toolset
        this.appName = appName
        this.actions = actions
    }

    async _call(input: string): Promise<string> {
        try {
            //check & remove
            return `Executed action on ${this.appName} with input: ${input}`
        } catch (error) {
            return "Failed to execute action."
        }
    }
}

class Composio_Tools implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Composio'
        this.name = 'composio'
        this.version = 1.0
        this.type = 'Composio'
        this.icon = 'composio.svg'
        this.category = 'Tools'
        this.description = 'Tool for building AI-powered applications with Composio'
        this.baseClasses = [this.type, ...getBaseClasses(ComposioTool)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['composioApi']
        }
        this.inputs = [
            {
                label: 'App Name',
                name: 'appName',
                type: 'asyncOptions',
                loadMethod: 'listApps',
                description: 'Select the app to connect with'
            },
            {
                label: 'Auth Status',
                name: 'authStatus',
                type: 'string',
                placeholder: 'Connection status will appear here'
            },
            {
                label: 'Actions to Use',
                name: 'actions',
                type: 'asyncOptions',
                loadMethod: 'listActions',
                description: 'Select the actions you want to use'
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        listApps: async (nodeData: INodeData, options?: ICommonObject): Promise<INodeOptionsValue[]> => {
            try {
                const credentialData = await getCredentialData(nodeData.credential ?? '', options ?? {})
                const composioApiKey = getCredentialParam('composioApi', credentialData, nodeData)

                if (!composioApiKey) {
                    return [
                        {
                            label: 'Please provide API Key first',
                            name: 'placeholder',
                            description: 'Enter your Composio API key in the credential field above'
                        }
                    ]
                }

                const toolset = new LangchainToolSet({ apiKey: composioApiKey })
                const apps = await toolset.client.apps.list()

                return apps.map(({ name, ...rest }) => ({
                    label: name.toUpperCase(),
                    name: name,
                    description: rest.description || name
                }))
            } catch (error) {
                console.error('Error loading apps:', error)
                return [
                    {
                        label: 'Error Loading Apps',
                        name: 'error',
                        description: 'Failed to load apps. Please check your API key and try again.'
                    }
                ]
            }
        },
        listActions: async (nodeData: INodeData, options?: ICommonObject): Promise<INodeOptionsValue[]> => {
            try {
                const credentialData = await getCredentialData(nodeData.credential ?? '', options ?? {})
                const composioApiKey = getCredentialParam('composioApi', credentialData, nodeData)
                const appName = nodeData.inputs?.appName as string

                if (!composioApiKey) {
                    return [{
                        label: 'Please provide API Key first',
                        name: 'placeholder',
                        description: 'Enter your Composio API key in the credential field above'
                    }]
                }

                if (!appName) {
                    return [{
                        label: 'Please select an App first',
                        name: 'placeholder',
                        description: 'Select an app from the dropdown above to view available actions'
                    }]
                }

                const toolset = new LangchainToolSet({ apiKey: composioApiKey })
                const actions = await toolset.getTools({ apps: [appName] })

                return actions.map(({ name, ...rest }) => ({
                    label: name.toUpperCase(),
                    name: name,
                    description: rest.description || name
                }))
            } catch (error) {
                console.error('Error loading actions:', error)
                return [{
                    label: 'Error Loading Actions',
                    name: 'error',
                    description: 'Failed to load actions. Please check your API key and try again.'
                }]
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        if (!nodeData.inputs) nodeData.inputs = {}

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const composioApiKey = getCredentialParam('composioApi', credentialData, nodeData)
        const appName = nodeData.inputs?.appName as string
        const actions = nodeData.inputs?.actions as string[]

        if (!composioApiKey) {
            nodeData.inputs = {
                appName: undefined,
                authStatus: '',
                actions: []
            }
            throw new Error('Please provide your Composio API key in credentials')
        }

        const toolset = new LangchainToolSet({ apiKey: composioApiKey })
        const tools = await toolset.getTools({ actions: [nodeData.inputs?.actions as string] })
        return tools
    }
}

module.exports = { nodeClass: Composio_Tools }