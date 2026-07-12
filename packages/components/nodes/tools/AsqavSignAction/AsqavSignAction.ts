import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../src/utils'

const DEFAULT_BASE_URL = 'https://api.asqav.com/api/v1'

class AsqavSignAction_Tools implements INode {
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
        this.label = 'Asqav Sign Action'
        this.name = 'asqavSignAction'
        this.version = 1.0
        this.type = 'AsqavSignAction'
        this.icon = 'asqav.svg'
        this.category = 'Tools'
        this.description =
            'Sign an agent action with Asqav and return the cryptographic compliance receipt (signature id, verification URL, timestamp)'
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['asqavApi']
        }
        this.inputs = [
            {
                label: 'Action Type',
                name: 'actionType',
                type: 'string',
                placeholder: 'api:call',
                description: 'The type of action being signed, e.g. "api:call" or "tool:invoke"'
            },
            {
                label: 'Context',
                name: 'context',
                type: 'json',
                optional: true,
                description: 'Optional JSON metadata describing the action. Only the values you pass are hashed into the receipt.'
            },
            {
                label: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                optional: true,
                placeholder: 'https://api.asqav.com/api/v1',
                description: 'Asqav API base URL. Defaults to the production endpoint. Override for a self-hosted Asqav instance.'
            }
        ]
    }

    async run(nodeData: INodeData, _input: string, options?: ICommonObject): Promise<string | ICommonObject> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options ?? {})
        const apiKey = getCredentialParam('asqavApiKey', credentialData, nodeData)

        const actionType = (nodeData.inputs?.actionType as string) ?? ''
        if (!actionType) {
            throw new Error('Asqav Sign Action: "Action Type" is required.')
        }

        let context: Record<string, unknown> = {}
        const rawContext = nodeData.inputs?.context
        if (rawContext) {
            if (typeof rawContext === 'string') {
                const trimmed = rawContext.trim()
                if (trimmed.length) {
                    try {
                        context = JSON.parse(trimmed)
                    } catch {
                        throw new Error('Asqav Sign Action: "Context" must be valid JSON.')
                    }
                }
            } else if (typeof rawContext === 'object') {
                context = rawContext as Record<string, unknown>
            }
        }

        const baseUrl = ((nodeData.inputs?.baseUrl as string) || DEFAULT_BASE_URL).replace(/\/+$/, '')
        const headers = {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
        }

        const agentResponse = await fetch(`${baseUrl}/agents/create`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name: 'flowise',
                algorithm: 'ml-dsa-65',
                capabilities: []
            })
        })
        if (!agentResponse.ok) {
            const detail = await agentResponse.text().catch(() => '')
            throw new Error(
                `Asqav Sign Action: agent create failed (${agentResponse.status} ${agentResponse.statusText})${detail ? `: ${detail}` : ''}`
            )
        }
        const agent = (await agentResponse.json()) as { agent_id: string }

        const signResponse = await fetch(`${baseUrl}/agents/${agent.agent_id}/sign`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                action_type: actionType,
                context,
                session_id: null,
                compliance_mode: true
            })
        })
        if (!signResponse.ok) {
            const detail = await signResponse.text().catch(() => '')
            throw new Error(
                `Asqav Sign Action: sign failed (${signResponse.status} ${signResponse.statusText})${detail ? `: ${detail}` : ''}`
            )
        }
        const receipt = (await signResponse.json()) as {
            signature_id: string
            action_id: string
            verification_url: string
            timestamp: string
            algorithm: string
            [key: string]: unknown
        }

        return {
            signatureId: receipt.signature_id,
            actionId: receipt.action_id,
            verificationUrl: receipt.verification_url,
            timestamp: receipt.timestamp,
            algorithm: receipt.algorithm,
            receipt
        }
    }
}

module.exports = { nodeClass: AsqavSignAction_Tools }
