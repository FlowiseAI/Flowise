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

    constructor(toolset: any, appName: string, actions: string[]) {
        super()
        this.toolset = toolset
        this.appName = appName
        this.actions = actions
    }

    async _call(input: string): Promise<string> {
        try {
            return `Executed action on ${this.appName} with input: ${input}`
        } catch (error) {
            return 'Failed to execute action'
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
                label: 'Connected Account',
                name: 'connectedAccountId',
                type: 'asyncOptions',
                loadMethod: 'listConnections',
                description: 'Select which connection to use',
                refresh: true
            },
            {
                label: 'Actions to Use',
                name: 'actions',
                type: 'asyncMultiOptions',
                loadMethod: 'listActions',
                description: 'Select the actions you want to use',
                refresh: true
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
        listConnections: async (nodeData: INodeData, options?: ICommonObject): Promise<INodeOptionsValue[]> => {
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
                        description: 'Select an app from the dropdown to view available connections'
                    }
                ]
            }

            const toolset = new LangchainToolSet({ apiKey: composioApiKey })

            const appInfo = await toolset.client.apps.get({ appKey: appName.toLowerCase() })
            const requiresAuth = (appInfo as any)?.no_auth !== true

            if (!requiresAuth) {
                return [
                    {
                        label: 'No connection needed',
                        name: 'No connection needed',
                        description: 'This app does not require authentication'
                    }
                ]
            }

            const connections = await toolset.client.connectedAccounts.list({ appNames: appName.toLowerCase() })
            const activeConnections = connections.items?.filter((c: any) => c.status === 'ACTIVE') || []

            if (activeConnections.length === 0) {
                return [
                    {
                        label: 'No connections available',
                        name: '',
                        description: 'Please connect the app on app.composio.dev first'
                    }
                ]
            }

            return activeConnections.map((c: any) => ({
                label: c.clientUniqueUserId || c.id,
                name: c.id,
                description: `Created: ${new Date(c.createdAt).toLocaleDateString()}`
            }))
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        if (!nodeData.inputs) nodeData.inputs = {}

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const composioApiKey = getCredentialParam('composioApi', credentialData, nodeData)

        if (!composioApiKey) {
            nodeData.inputs = {
                appName: undefined,
                connectedAccountId: '',
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

        const toolset = new LangchainToolSet({ apiKey: composioApiKey })
        const appName = nodeData.inputs?.appName as string

        if (!appName) {
            throw new Error('App name is required. Please select an app.')
        }

        const appInfo = await toolset.client.apps.get({ appKey: appName.toLowerCase() })
        const requiresAuth = (appInfo as any)?.no_auth !== true

        if (!requiresAuth) {
            const tools = await toolset.getTools({ actions })
            return tools
        }

        const selectedConnectionId = nodeData.inputs?.connectedAccountId as string

        if (!selectedConnectionId) {
            throw new Error(`Please select a connected account for ${appName}`)
        }

        const activeConnection = await toolset.client.connectedAccounts.get({ connectedAccountId: selectedConnectionId })

        if (!activeConnection || (activeConnection as any).status !== 'ACTIVE') {
            throw new Error(
                `Selected connection is no longer active for ${appName}. Please select a different connection or reconnect on app.composio.dev`
            )
        }

        const entityId = (activeConnection as any).clientUniqueUserId || 'default'
        const toolsetWithEntity = new LangchainToolSet({ apiKey: composioApiKey, entityId })
        const tools = await toolsetWithEntity.getTools({ actions })
        return tools
    }
}

module.exports = { nodeClass: Composio_Tools }
