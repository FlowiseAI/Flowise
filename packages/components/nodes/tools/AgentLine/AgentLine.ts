import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { AgentLineTool } from './core'

class AgentLine_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    author: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'AgentLine'
        this.name = 'agentLine'
        this.version = 1.0
        this.type = 'AgentLine'
        this.icon = 'agentline.png'
        this.category = 'Tools'
        this.author = 'AgentLine'
        this.description =
            'AI-native telephony — give your agent a real phone number, voice, and SMS via AgentLine'
        this.baseClasses = [this.type, ...getBaseClasses(AgentLineTool)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['agentLineApi']
        }
        this.inputs = [
            {
                label: 'Operation',
                name: 'operation',
                type: 'options',
                description: 'The AgentLine telephony operation for the agent to perform',
                options: [
                    {
                        label: 'Create Agent',
                        name: 'createAgent',
                        description: 'Create a new AI voice agent'
                    },
                    {
                        label: 'List Agents',
                        name: 'listAgents',
                        description: 'List all AI voice agents'
                    },
                    {
                        label: 'Update Agent',
                        name: 'updateAgent',
                        description: 'Update an agent configuration, prompt, or voice'
                    },
                    {
                        label: 'Delete Agent',
                        name: 'deleteAgent',
                        description: 'Delete an AI voice agent'
                    },
                    {
                        label: 'Buy Phone Number',
                        name: 'buyPhoneNumber',
                        description: 'Provision a new phone number for an agent'
                    },
                    {
                        label: 'List Phone Numbers',
                        name: 'listPhoneNumbers',
                        description: 'List all provisioned phone numbers'
                    },
                    {
                        label: 'Make Outbound Call',
                        name: 'makeOutboundCall',
                        description: 'Initiate a phone call from an agent to a number'
                    },
                    {
                        label: 'List Calls',
                        name: 'listCalls',
                        description: 'List call history'
                    },
                    {
                        label: 'Get Call Transcript',
                        name: 'getCallTranscript',
                        description: 'Get the full transcript of a completed call'
                    },
                    {
                        label: 'Poll Events',
                        name: 'pollEvents',
                        description: 'Poll for call events and notifications (consume-once)'
                    },
                    {
                        label: 'Get Account Balance',
                        name: 'getAccountBalance',
                        description: 'Check the current account balance'
                    },
                    {
                        label: 'Get Expenditure Breakdown',
                        name: 'getExpenditure',
                        description: 'Get spending breakdown by category'
                    }
                ],
                default: 'listAgents'
            },
            {
                label: 'Tool Description',
                name: 'toolDescription',
                type: 'string',
                description:
                    'Custom description for this tool. If left empty, a default description will be used based on the selected operation.',
                rows: 4,
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const operation = nodeData.inputs?.operation as string
        const toolDescription = nodeData.inputs?.toolDescription as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('agentLineApiKey', credentialData, nodeData)
        const baseUrl =
            getCredentialParam('agentLineBaseUrl', credentialData, nodeData) ||
            'https://api.agentline.cloud'

        if (!apiKey) {
            throw new Error('AgentLine API key is required. Please configure the AgentLine credential.')
        }

        const tool = new AgentLineTool({
            apiKey,
            baseUrl,
            operation: operation || 'listAgents'
        })

        // Allow users to override the tool description
        if (toolDescription) {
            tool.description = toolDescription
        }

        return tool
    }
}

module.exports = { nodeClass: AgentLine_Tools }
