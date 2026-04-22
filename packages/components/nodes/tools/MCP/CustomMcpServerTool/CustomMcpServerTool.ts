import { Tool } from '@langchain/core/tools'
import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../../src/Interface'
import { MCPToolkit } from '../core'
import { decryptCredentialData } from '../../../../src/utils'
import { DataSource } from 'typeorm'

class CustomMcpServerTool implements INode {
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
        this.label = 'Custom MCP Server'
        this.name = 'customMcpServerTool'
        this.version = 1.0
        this.type = 'Custom MCP Server Tool'
        this.icon = 'customMCP.png'
        this.category = 'Tools (MCP)'
        this.description = 'Use tools from authorized MCP servers configured in workspace'
        this.inputs = [
            {
                label: 'Custom MCP Server',
                name: 'mcpServerId',
                type: 'asyncOptions',
                loadMethod: 'listServers'
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
        listServers: async (_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> => {
            try {
                const appDataSource = options.appDataSource as DataSource
                const databaseEntities = options.databaseEntities as IDatabaseEntity
                if (!appDataSource || !databaseEntities?.['CustomMcpServer']) {
                    return []
                }

                const workspaceId = (options.searchOptions as ICommonObject | undefined)?.workspaceId as string | undefined
                if (!workspaceId) return []

                const mcpServers = await appDataSource.getRepository(databaseEntities['CustomMcpServer']).find({
                    where: { workspaceId, status: 'AUTHORIZED' },
                    order: { updatedDate: 'DESC' }
                })

                return mcpServers.map((server: any) => {
                    let maskedUrl: string
                    try {
                        const parsed = new URL(server.serverUrl)
                        maskedUrl = parsed.pathname && parsed.pathname !== '/' ? `${parsed.origin}/************` : parsed.origin
                    } catch {
                        maskedUrl = '************'
                    }
                    return {
                        label: server.name,
                        name: server.id,
                        description: maskedUrl
                    }
                })
            } catch (error) {
                return []
            }
        },
        listActions: async (nodeData: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> => {
            try {
                const toolset = await this.getTools(nodeData, options)
                toolset.sort((a: any, b: any) => a.name.localeCompare(b.name))

                return toolset.map(({ name, ...rest }) => ({
                    label: name.toUpperCase(),
                    name: name,
                    description: rest.description || name
                }))
            } catch (error) {
                return [
                    {
                        label: 'No Available Actions',
                        name: 'error',
                        description: 'Select an authorized MCP server first, then refresh'
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
                console.error('Error parsing mcp actions:', error)
            }
        }

        return tools.filter((tool: any) => mcpActions.includes(tool.name))
    }

    async getTools(nodeData: INodeData, options: ICommonObject): Promise<Tool[]> {
        const serverId = nodeData.inputs?.mcpServerId as string
        if (!serverId) {
            throw new Error('MCP Server is required')
        }

        const appDataSource = options.appDataSource as DataSource
        const databaseEntities = options.databaseEntities as IDatabaseEntity
        if (!appDataSource || !databaseEntities?.['CustomMcpServer']) {
            throw new Error('Database not available')
        }

        const workspaceId =
            (options.workspaceId as string | undefined) ??
            ((options.searchOptions as ICommonObject | undefined)?.workspaceId as string | undefined)
        if (!workspaceId) {
            throw new Error('Workspace context is required to load MCP server')
        }

        const serverRecord = await appDataSource.getRepository(databaseEntities['CustomMcpServer']).findOneBy({ id: serverId, workspaceId })
        if (!serverRecord) {
            throw new Error(`MCP server ${serverId} not found`)
        }
        if (serverRecord.status !== 'AUTHORIZED') {
            throw new Error(`MCP server "${serverRecord.name}" is not authorized. Please authorize it in the Tools page first.`)
        }

        // Build headers from encrypted authConfig — only when authType explicitly requires them
        let headers: Record<string, string> = {}
        if (serverRecord.authType === 'CUSTOM_HEADERS' && serverRecord.authConfig) {
            try {
                const decrypted = await decryptCredentialData(serverRecord.authConfig)
                if (decrypted?.headers && typeof decrypted.headers === 'object') {
                    headers = decrypted.headers as Record<string, string>
                }
            } catch {
                // authConfig decryption failed — proceed without headers
            }
        }

        const serverParams: any = {
            url: serverRecord.serverUrl,
            ...(Object.keys(headers).length > 0 ? { headers } : {})
        }

        if (options.cachePool) {
            const cacheKey = `mcpServer_${serverId}`
            const cachedResult = await options.cachePool.getMCPCache(cacheKey)
            if (cachedResult) {
                return cachedResult.tools
            }
        }

        const toolkit = new MCPToolkit(serverParams, 'sse')
        await toolkit.initialize()

        const tools = toolkit.tools ?? []

        if (options.cachePool) {
            const cacheKey = `mcpServer_${serverId}`
            await options.cachePool.addMCPCache(cacheKey, { toolkit, tools })
        }

        return tools.map((tool: Tool) => {
            tool.name = this.formatToolName(tool.name)
            return tool
        }) as Tool[]
    }

    /**
     * Formats the tool name to ensure it is a valid identifier by replacing spaces and special characters with underscores.
     * This is necessary because tool names may be used as identifiers in various contexts where special characters could cause issues.
     * For example, a tool named "Get User Info" would be formatted to "Get_User_Info".
     * This method can be enhanced further to handle edge cases as needed.
     */
    private formatToolName = (name: string): string => name.trim().replace(/[^a-zA-Z0-9_-]/g, '_')
}

module.exports = { nodeClass: CustomMcpServerTool }
