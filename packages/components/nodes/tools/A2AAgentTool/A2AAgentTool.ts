import { DynamicTool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { A2AClientWrapper, sanitizeErrorMessage } from '../../../src/a2aClient'

class A2AAgentTool_Tools implements INode {
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
        this.label = 'A2A Agent Tool'
        this.name = 'a2aAgentTool'
        this.version = 1.0
        this.type = 'A2AAgentTool'
        this.icon = 'a2a-remote-agent.svg'
        this.category = 'Tools'
        this.description = 'Call an external A2A protocol agent as a tool'
        this.baseClasses = [this.type, ...getBaseClasses(DynamicTool), 'Tool']
        this.credential = {
            label: 'A2A Agent Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['a2aAgentCredential'],
            optional: true
        }
        this.inputs = [
            {
                label: 'Agent Card URL',
                name: 'agentCardUrl',
                type: 'string',
                placeholder: 'https://remote.example.com/.well-known/agent.json'
            },
            {
                label: 'Tool Name',
                name: 'toolName',
                type: 'string',
                description: 'Override the tool name exposed to the LLM. Defaults to the remote Agent Card name.',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Tool Description',
                name: 'toolDescription',
                type: 'string',
                rows: 4,
                description: 'Override the tool description exposed to the LLM. Defaults to the remote Agent Card description.',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Skill',
                name: 'skillId',
                type: 'asyncOptions',
                loadMethod: 'listRemoteSkills',
                refresh: true,
                optional: true
            },
            {
                label: 'Timeout (ms)',
                name: 'timeout',
                type: 'number',
                default: 120000,
                optional: true,
                step: 1000,
                additionalParams: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listRemoteSkills(nodeData: INodeData, _options: ICommonObject): Promise<INodeOptionsValue[]> {
            const agentCardUrl = nodeData.inputs?.agentCardUrl as string
            const skills = await A2AClientWrapper.listRemoteSkills(agentCardUrl)
            return skills as INodeOptionsValue[]
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const agentCardUrl = nodeData.inputs?.agentCardUrl as string
        const toolName = nodeData.inputs?.toolName as string
        const toolDescription = nodeData.inputs?.toolDescription as string
        const skillId = nodeData.inputs?.skillId as string
        const timeout = (nodeData.inputs?.timeout as number) || 120000

        if (!agentCardUrl) {
            throw new Error('A2A Agent Tool: Agent Card URL is required')
        }

        let authType: string | undefined
        let apiKey: string | undefined
        let apiKeyHeaderName: string | undefined
        let bearerToken: string | undefined

        if (nodeData.credential) {
            const credentialData = await getCredentialData(nodeData.credential, options)
            authType = getCredentialParam('authType', credentialData, nodeData)
            apiKey = getCredentialParam('apiKey', credentialData, nodeData)
            apiKeyHeaderName = getCredentialParam('apiKeyHeaderName', credentialData, nodeData)
            bearerToken = getCredentialParam('bearerToken', credentialData, nodeData)
        }

        const wrapper = new A2AClientWrapper({
            agentCardUrl,
            authType: authType as 'apiKey' | 'bearer' | undefined,
            apiKey,
            apiKeyHeaderName,
            bearerToken,
            timeout
        })

        // Fetch the Agent Card to derive defaults for name/description
        const agentCard = await wrapper.fetchAgentCard()

        const sanitize = (raw: string): string =>
            raw
                .toLowerCase()
                .replace(/\s+/g, '_')
                .replace(/[^a-z0-9_-]/g, '')
                .slice(0, 64) || 'a2a_agent'

        const derivedName = sanitize(toolName?.trim() || agentCard.name || 'a2a_agent')
        const derivedDescription =
            (toolDescription && toolDescription.trim()) || agentCard.description || `Call the remote A2A agent "${agentCard.name}".`

        // LangChain's DynamicTool expects a string return; always use the sync
        // sendMessage path because tool interfaces don't support streaming.
        const tool = new DynamicTool({
            name: derivedName,
            description: derivedDescription,
            func: async (input: string): Promise<string> => {
                try {
                    const response = await wrapper.sendMessage(input, skillId ? { skillId } : undefined)
                    return response.responseText ?? ''
                } catch (error: any) {
                    console.error('[A2AAgentTool] Error calling A2A agent:', error)
                    const safeMsg = sanitizeErrorMessage(error?.message ?? 'A2A Agent Tool: unknown error')
                    return `Error calling A2A agent: ${safeMsg}`
                }
            }
        })

        return tool
    }
}

module.exports = { nodeClass: A2AAgentTool_Tools }
