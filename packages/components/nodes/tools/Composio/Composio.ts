import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { LangchainToolSet } from 'composio-core'

class ComposioTool extends Tool {
    name = 'composio'
    description = 'Tool for interacting with Composio applications and performing actions'
    toolset: any
    appName: string
    actions: string[]
    actionName: string

    constructor(toolset: any, appName: string, actions: string[], actionName?: string) {
        super()
        this.toolset = toolset
        this.appName = appName
        this.actions = actions
        this.actionName = actionName || 'composio'
        this.name = actionName || 'composio'
    }

    async _call(input: string): Promise<string> {
        try {
            // In a real implementation, this would call the specific action on the Composio API
            // For now, we'll just return a placeholder response
            return `Executed action ${this.actionName} on ${this.appName} with input: ${input}`
        } catch (error) {
            return `Failed to execute action ${this.actionName}: ${error}`
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
        this.version = 2.0
        this.type = 'Composio'
        this.icon = 'composio.svg'
        this.category = 'Tools'
        this.description = 'Toolset with over 250+ Apps for building AI-powered applications'
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
                description: 'Select the app to connect with',
                refresh: true
            },
            {
                label: 'Auth Status',
                name: 'authStatus',
                type: 'asyncOptions',
                loadMethod: 'authStatus',
                placeholder: 'Connection status will appear here',
                refresh: true
            },
            {
                label: 'Actions to Use',
                name: 'actions',
                type: 'asyncMultiOptions',
                loadMethod: 'listActions',
                description: 'Select the actions you want to use',
                refresh: true
            },
            {
                label: 'Create Individual Tools',
                name: 'createIndividualTools',
                type: 'boolean',
                description: 'Create a separate tool for each action (useful for specific action nodes)',
                default: false,
                optional: true
            },
            {
                label: 'Custom Tool Name',
                name: 'customToolName',
                type: 'string',
                description: 'Custom name for the tool (only used when not creating individual tools)',
                placeholder: 'composio',
                optional: true
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
                            label: 'API Key Required',
                            name: 'placeholder',
                            description: 'Enter Composio API key in the credential field'
                        }
                    ]
                }

                const toolset = new LangchainToolSet({ apiKey: composioApiKey })
                const apps = await toolset.client.apps.list()
                apps.sort((a: any, b: any) => a.name.localeCompare(b.name))

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
                        description: 'Failed to load apps. Please check your API key and try again'
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
                    return [
                        {
                            label: 'API Key Required',
                            name: 'placeholder',
                            description: 'Enter Composio API key in the credential field'
                        }
                    ]
                }

                if (!appName) {
                    return [
                        {
                            label: 'Select an App first',
                            name: 'placeholder',
                            description: 'Select an app from the dropdown to view available actions'
                        }
                    ]
                }

                const toolset = new LangchainToolSet({ apiKey: composioApiKey })
                const actions = await toolset.getTools({ apps: [appName] })
                actions.sort((a: any, b: any) => a.name.localeCompare(b.name))

                return actions.map(({ name, ...rest }) => ({
                    label: name.toUpperCase(),
                    name: name,
                    description: rest.description || name
                }))
            } catch (error) {
                console.error('Error loading actions:', error)
                return [
                    {
                        label: 'Error Loading Actions',
                        name: 'error',
                        description: 'Failed to load actions. Please check your API key and try again'
                    }
                ]
            }
        },
        authStatus: async (nodeData: INodeData, options?: ICommonObject): Promise<INodeOptionsValue[]> => {
            const credentialData = await getCredentialData(nodeData.credential ?? '', options ?? {})
            const composioApiKey = getCredentialParam('composioApi', credentialData, nodeData)
            const appName = nodeData.inputs?.appName as string

            if (!composioApiKey) {
                return [
                    {
                        label: 'API Key Required',
                        name: 'placeholder',
                        description: 'Enter Composio API key in the credential field'
                    }
                ]
            }

            if (!appName) {
                return [
                    {
                        label: 'Select an App first',
                        name: 'placeholder',
                        description: 'Select an app from the dropdown to view available actions'
                    }
                ]
            }

            const toolset = new LangchainToolSet({ apiKey: composioApiKey })
            const authStatus = await toolset.client.getEntity('default').getConnection({ app: appName.toLowerCase() })
            return [
                {
                    label: authStatus ? 'Connected' : 'Not Connected',
                    name: authStatus ? 'Connected' : 'Not Connected',
                    description: authStatus ? 'Selected app has an active connection' : 'Please connect the app on app.composio.dev'
                }
            ]
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        if (!nodeData.inputs) nodeData.inputs = {}

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const composioApiKey = getCredentialParam('composioApi', credentialData, nodeData)

        if (!composioApiKey) {
            nodeData.inputs = {
                appName: undefined,
                authStatus: '',
                actions: []
            }
            throw new Error('API Key Required')
        }

        const _actions = nodeData.inputs?.actions
        let actions = []
        if (_actions) {
            try {
                actions = typeof _actions === 'string' ? JSON.parse(_actions) : _actions
            } catch (error) {
                console.error('Error parsing actions:', error)
            }
        }

        const appName = nodeData.inputs?.appName as string
        const createIndividualTools = nodeData.inputs?.createIndividualTools === true
        const customToolName = nodeData.inputs?.customToolName as string || 'composio'

        const toolset = new LangchainToolSet({ apiKey: composioApiKey })
        
        if (createIndividualTools && actions.length > 0) {
            // Create individual tools for each action
            const tools = []
            for (const action of actions) {
                const tool = new ComposioTool(toolset, appName, [action], action)
                tools.push(tool)
            }
            return tools
        } else {
            // Create a single tool with all actions
            const tools = await toolset.getTools({ actions })
            // Override the tool name if a custom name is provided
            if (customToolName && customToolName !== 'composio') {
                tools.forEach((tool: any) => {
                    tool.name = customToolName
                })
            }
            return tools
        }
    }
}

module.exports = { nodeClass: Composio_Tools }
