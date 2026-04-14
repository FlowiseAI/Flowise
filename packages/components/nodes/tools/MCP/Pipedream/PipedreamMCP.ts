import { tool, Tool } from '@langchain/core/tools'
import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../../src/Interface'
import { getCredentialData, getCredentialParam, getVars, prepareSandboxVars } from '../../../../src/utils'
import { DataSource } from 'typeorm'
import { MCPToolkit } from '../core'
import axios from 'axios'
import { z, ZodTypeAny } from 'zod'
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js'
import type { CallToolRequest, CallToolResult, TextContent, Tool as McpTool } from '@modelcontextprotocol/sdk/types.js'

const VAR_PLACEHOLDER_RE = /\{\{\$vars\.([^}]+)\}\}/g
const PIPEDREAM_CONNECT_URL_PATTERN = /https:\/\/pipedream\.com\/_static\/connect\.html\?[^\s"')]+/
const tokenCache = new Map<string, { token: string; expiresAt: number }>()

function extractConnectUrl(text: string): string | null {
    const match = text.match(PIPEDREAM_CONNECT_URL_PATTERN)
    return match ? match[0] : null
}

function formatPipedreamResponse(res: CallToolResult): string {
    const textItems = res.content.filter((c): c is TextContent => c.type === 'text').map((c) => c.text)
    const text = textItems.join('\n')

    const connectUrl = extractConnectUrl(text)
    if (connectUrl) {
        return `ACTION_REQUIRED: Account connection needed.

The user must connect their account before this action can be executed.
Direct them to open the following URL in their browser:

[Connect URL](${connectUrl})  

Once the user has connected their account, retry the original request.`
    }

    if (res.isError) {
        return `ERROR: ${text}`
    }

    return text
}

function createSchemaModel(inputSchema: { type: string; properties?: Record<string, any> }): z.ZodObject<any> {
    if (inputSchema.type !== 'object' || !inputSchema.properties) {
        throw new Error('Invalid schema type or missing properties')
    }
    const schemaProperties = Object.entries(inputSchema.properties).reduce((acc, [key]) => {
        acc[key] = z.any()
        return acc
    }, {} as Record<string, ZodTypeAny>)
    return z.object(schemaProperties)
}

async function createPipedreamTool(toolkit: MCPToolkit, name: string, description: string, argsSchema: any): Promise<Tool> {
    return tool(
        async (input): Promise<string> => {
            const client = await toolkit.createClient()
            try {
                const req: CallToolRequest = {
                    method: 'tools/call',
                    params: { name, arguments: input as any }
                }
                const res = await client.request(req, CallToolResultSchema)
                return formatPipedreamResponse(res)
            } finally {
                await client.close()
            }
        },
        { name, description, schema: argsSchema }
    )
}

class Pipedream_MCP implements INode {
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
        this.label = 'Pipedream MCP'
        this.name = 'pipedreamMCP'
        this.version = 1.0
        this.type = 'Pipedream MCP Tool'
        this.icon = 'pipedream.svg'
        this.category = 'Tools (MCP)'
        this.description = 'MCP Server for Pipedream. For critical actions, ensure "Require Human Input" is enabled on the Agent node.'
        this.documentation = 'https://pipedream.com/docs/connect/mcp/developers'
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['pipedreamOAuthApi']
        }
        this.inputs = [
            {
                label: 'Environment',
                name: 'environment',
                type: 'options',
                options: [
                    {
                        label: 'Development',
                        name: 'development'
                    },
                    {
                        label: 'Production',
                        name: 'production'
                    }
                ],
                default: 'development'
            },
            {
                label: 'App Slug',
                name: 'appSlug',
                type: 'string',
                description:
                    'The unique app identifier (name slug) for a Pipedream app (e.g. <code>slack</code>, <code>gmail</code>, <code>notion</code>, <code>linear</code>). Browse all available apps and their slugs at <a target="_blank" href="https://mcp.pipedream.com">mcp.pipedream.com</a>. The slug is the lowercase name shown in the app URL on Pipedream (e.g. pipedream.com/apps/<b>slack</b>). You can specify multiple apps by providing comma-separated slugs (e.g. <code>slack,notion</code>).'
            },
            {
                label: 'User ID',
                name: 'externalUserId',
                type: 'string',
                description:
                    'A unique identifier for your end user (e.g. email or user ID from your system). Supports Flowise variables (e.g. <code>{{$vars.user_email}}</code>) and flow variables (e.g. <code>{{$flow.sessionId}}</code>).',
                acceptVariable: true,
                placeholder: '{{$vars.user_email}}'
            },
            {
                label: 'Tool Mode',
                name: 'toolMode',
                type: 'options',
                options: [
                    {
                        label: 'Tools only',
                        name: 'tools-only'
                    }
                ],
                default: 'tools-only'
            },
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

    //@ts-ignore
    loadMethods = {
        listActions: async (nodeData: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> => {
            try {
                const appSlug = nodeData.inputs?.appSlug as string
                const externalUserId = nodeData.inputs?.externalUserId as string
                if (!appSlug || !externalUserId) {
                    return [
                        {
                            label: 'Please fill in App Slug and User ID first',
                            name: 'placeholder',
                            description: 'Configure the required fields above, then refresh'
                        }
                    ]
                }

                const toolset = await this.getTools(nodeData, options, true)
                toolset.sort((a: any, b: any) => a.name.localeCompare(b.name))

                return toolset.map(({ name, ...rest }) => ({
                    label: name.toUpperCase(),
                    name: name,
                    description: rest.description || name
                }))
            } catch (error: any) {
                console.error('Error listing actions:', error instanceof Error ? error.message : String(error))
                return [
                    {
                        label: 'No Available Actions',
                        name: 'error',
                        description: error.message || 'Error loading actions'
                    }
                ]
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const tools = await this.getTools(nodeData, options)
        const _mcpActions = nodeData.inputs?.mcpActions
        let mcpActions: string[] = []
        if (_mcpActions) {
            try {
                mcpActions = typeof _mcpActions === 'string' ? JSON.parse(_mcpActions) : _mcpActions
            } catch (error) {
                console.error('Error parsing mcp actions:', error instanceof Error ? error.message : String(error))
            }
        }
        return tools.filter((tool: any) => mcpActions.includes(tool.name))
    }

    private async fetchAccessToken(clientId: string, clientSecret: string, scope?: string): Promise<string> {
        const tokenCacheKey = `${clientId}:${scope ?? '*'}`
        const cached = tokenCache.get(tokenCacheKey)
        if (cached && cached.expiresAt > Date.now() + 60_000) {
            return cached.token
        }

        try {
            const body: Record<string, string> = {
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret
            }
            if (scope) {
                body.scope = scope
            }
            const response = await axios.post('https://api.pipedream.com/v1/oauth/token', body, {
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            const accessToken = response.data?.access_token
            if (!accessToken) {
                throw new Error('Failed to retrieve access token: Response missing access_token field')
            }

            const expiresIn = response.data?.expires_in ?? 3600
            tokenCache.set(tokenCacheKey, {
                token: accessToken,
                expiresAt: Date.now() + expiresIn * 1000
            })

            return accessToken
        } catch (error: any) {
            if (error.response?.status === 401) {
                tokenCache.delete(tokenCacheKey)
                throw new Error('Invalid Pipedream credentials. Please verify your Client ID and Client Secret.')
            }
            const message = error.message ?? 'Unknown error'
            const code = error.code ?? error.response?.status ?? 'UNKNOWN'
            throw new Error(`Pipedream OAuth token request failed [${code}]: ${message}`)
        }
    }

    private async resolveVarsInString(value: string, nodeData: INodeData, options: ICommonObject): Promise<string> {
        if (!value.includes('{{$vars.')) return value

        const workspaceId = options?.searchOptions?.workspaceId?._value || options?.workspaceId
        if (!workspaceId) return value

        const appDataSource = options.appDataSource as DataSource
        const databaseEntities = options.databaseEntities as IDatabaseEntity
        const optionsWithWorkspaceId = options.workspaceId ? options : { ...options, workspaceId }
        const variables = await getVars(appDataSource, databaseEntities, nodeData, optionsWithWorkspaceId)
        const vars = prepareSandboxVars(variables) as Record<string, string>

        return value.replace(VAR_PLACEHOLDER_RE, (match, varName) => {
            return vars[varName] != null ? String(vars[varName]) : match
        })
    }

    async getTools(nodeData: INodeData, options: ICommonObject, isLoadMethod = false): Promise<Tool[]> {
        const appSlug = nodeData.inputs?.appSlug as string
        if (!appSlug) {
            throw new Error('Pipedream app slug is required')
        }

        const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{0,98}[a-z0-9])?(?:,\s*[a-z0-9](?:[a-z0-9_-]{0,98}[a-z0-9])?)*$/
        if (!SLUG_PATTERN.test(appSlug)) {
            throw new Error('Invalid app slug format. Must be lowercase letters, digits, hyphens and underscores only.')
        }

        let externalUserId = nodeData.inputs?.externalUserId as string
        externalUserId = await this.resolveVarsInString(externalUserId, nodeData, options)

        if (externalUserId.includes('{{')) {
            if (!isLoadMethod) {
                throw new Error(
                    'Variables in User ID are not resolved. ' +
                        '{{$vars.*}} requires a matching workspace variable. ' +
                        '{{$flow.*}} variables (e.g. sessionId) are only available at runtime, not when refreshing actions.'
                )
            }
            // For loadMethods context, use a sanitized fallback so tool listing still works.
            // The actual externalUserId will be resolved at runtime.
            externalUserId = 'flowise_preview_user'
        }

        externalUserId = externalUserId.replace(/<[^>]*>/g, '').trim()
        if (!externalUserId) {
            throw new Error('Pipedream user ID is required')
        }

        const SAFE_USER_ID = /^[a-zA-Z0-9._@+-]{1,250}$/
        if (!SAFE_USER_ID.test(externalUserId.trim())) {
            throw new Error('User ID contains invalid characters. Allowed: letters, digits, . _ @ + -')
        }

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const projectId = getCredentialParam('projectId', credentialData, nodeData)
        const oauthScopes = getCredentialParam('oauthScopes', credentialData, nodeData) as string | 'connect:*'

        if (!projectId) {
            throw new Error('Pipedream Project ID is required in credentials')
        }

        const clientId = getCredentialParam('clientId', credentialData, nodeData)
        const clientSecret = getCredentialParam('clientSecret', credentialData, nodeData)

        if (!clientId || !clientSecret) {
            throw new Error('Pipedream Client ID and Client Secret are required in credentials')
        }
        const accessToken = await this.fetchAccessToken(clientId, clientSecret, oauthScopes)

        const environment = (nodeData.inputs?.environment as string) || 'development'
        const toolMode = (nodeData.inputs?.toolMode as string) || 'tools-only'

        const serverParams = {
            url: 'https://remote.mcp.pipedream.net',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'x-pd-project-id': projectId,
                'x-pd-environment': environment,
                'x-pd-external-user-id': externalUserId,
                'x-pd-app-slug': appSlug,
                'x-pd-tool-mode': toolMode
            }
        }

        try {
            const toolkit = new MCPToolkit(serverParams as any, 'sse')
            await toolkit.initialize()

            const rawTools = toolkit._tools?.tools ?? []
            if (rawTools.length === 0) {
                throw new Error(`No tools available for the Pipedream app slug "${appSlug}". Please check your configuration.`)
            }

            const toolPromises = rawTools.map((t: McpTool) =>
                createPipedreamTool(toolkit, t.name, t.description || t.name, createSchemaModel(t.inputSchema))
            )
            const settled = await Promise.allSettled(toolPromises)
            const tools = settled.filter((r): r is PromiseFulfilledResult<Tool> => r.status === 'fulfilled').map((r) => r.value)

            if (tools.length === 0) {
                throw new Error(`No tools available for the Pipedream app slug "${appSlug}". Please check your configuration.`)
            }

            return tools
        } catch (error: any) {
            if (error.message?.includes('404')) {
                throw new Error(`Pipedream app slug "${appSlug}" not found. Please verify the slug on mcp.pipedream.com.`)
            }
            if (error.message?.includes('401')) {
                throw new Error('Invalid Pipedream credentials. Please verify your Client ID and Client Secret.')
            }
            if (error.message?.includes('timeout') || error.message?.includes('ECONNABORTED')) {
                throw new Error('Connection to Pipedream MCP server timed out. Please check your network connectivity.')
            }
            if (error.message?.includes('ECONNREFUSED')) {
                throw new Error('Connection refused by Pipedream MCP server. The service may be temporarily unavailable.')
            }
            throw new Error(`Pipedream MCP error: ${error.message ?? 'Unknown error'}`)
        }
    }
}

module.exports = { nodeClass: Pipedream_MCP }
