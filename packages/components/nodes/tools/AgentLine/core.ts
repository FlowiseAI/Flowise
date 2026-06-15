import { Tool } from '@langchain/core/tools'

/**
 * AgentLine API operations.
 * Each operation maps to a REST endpoint on the AgentLine platform.
 */
export interface AgentLineToolConfig {
    apiKey: string
    baseUrl: string
    operation: string
}

/**
 * AgentLine operations registry.
 * Maps operation names to HTTP method + endpoint + description.
 */
interface OperationDef {
    method: string
    path: string
    description: string
    inputDescription: string
    requiresBody: boolean
}

const OPERATIONS: Record<string, OperationDef> = {
    createAgent: {
        method: 'POST',
        path: '/v1/agents',
        description: 'Create a new AI voice agent on AgentLine',
        inputDescription:
            'JSON string with: name (required, string), system_prompt (optional, string), ' +
            'greeting (optional, string for what the agent says when answering), ' +
            'voice (optional, string, e.g. "alloy")',
        requiresBody: true
    },
    listAgents: {
        method: 'GET',
        path: '/v1/agents',
        description: 'List all AI voice agents on your AgentLine account',
        inputDescription: 'No input required. Pass an empty string or "{}".',
        requiresBody: false
    },
    updateAgent: {
        method: 'PUT',
        path: '/v1/agents/{id}',
        description: 'Update an existing AI voice agent configuration',
        inputDescription:
            'JSON string with: id (required, string — the agent ID), ' +
            'and any fields to update: name, system_prompt, greeting, voice',
        requiresBody: true
    },
    deleteAgent: {
        method: 'DELETE',
        path: '/v1/agents/{id}',
        description: 'Delete an AI voice agent',
        inputDescription: 'JSON string with: id (required, string — the agent ID to delete)',
        requiresBody: false
    },
    buyPhoneNumber: {
        method: 'POST',
        path: '/v1/numbers',
        description: 'Provision a new phone number and attach it to an agent',
        inputDescription:
            'JSON string with: agent_id (required, string), ' +
            'country (optional, "US" or "IN", defaults to "US")',
        requiresBody: true
    },
    listPhoneNumbers: {
        method: 'GET',
        path: '/v1/numbers',
        description: 'List all provisioned phone numbers on your AgentLine account',
        inputDescription: 'No input required. Pass an empty string or "{}".',
        requiresBody: false
    },
    makeOutboundCall: {
        method: 'POST',
        path: '/v1/calls',
        description: 'Initiate an outbound phone call from an agent to a phone number',
        inputDescription:
            'JSON string with: agent_id (required, string), ' +
            'to (required, string — E.164 phone number like "+14155551234"), ' +
            'from_number (optional, string — the AgentLine number to call from)',
        requiresBody: true
    },
    listCalls: {
        method: 'GET',
        path: '/v1/calls',
        description: 'List call history for your AgentLine account',
        inputDescription: 'No input required. Pass an empty string or "{}".',
        requiresBody: false
    },
    getCallTranscript: {
        method: 'GET',
        path: '/v1/calls/{id}/transcript',
        description: 'Get the full transcript of a completed phone call',
        inputDescription: 'JSON string with: id (required, string — the call ID)',
        requiresBody: false
    },
    pollEvents: {
        method: 'GET',
        path: '/v1/events',
        description: 'Poll the event mailbox for call completion notifications and other events (consume-once)',
        inputDescription: 'No input required. Pass an empty string or "{}".',
        requiresBody: false
    },
    getAccountBalance: {
        method: 'GET',
        path: '/v1/billing/balance',
        description: 'Check the current account balance on AgentLine',
        inputDescription: 'No input required. Pass an empty string or "{}".',
        requiresBody: false
    },
    getExpenditure: {
        method: 'GET',
        path: '/v1/billing/expenditure',
        description: 'Get a spending breakdown by category (calls, numbers, etc.)',
        inputDescription: 'No input required. Pass an empty string or "{}".',
        requiresBody: false
    }
}

/**
 * AgentLine Tool — a LangChain-compatible tool that calls the AgentLine REST API.
 *
 * When an LLM agent decides to use this tool, it receives the operation description
 * and passes a JSON string as input. The tool parses it, constructs the HTTP request,
 * and returns the API response as a string for the LLM to interpret.
 */
export class AgentLineTool extends Tool {
    name: string
    description: string

    private apiKey: string
    private baseUrl: string
    private operation: string

    constructor(config: AgentLineToolConfig) {
        super()
        this.apiKey = config.apiKey
        this.baseUrl = config.baseUrl.replace(/\/+$/, '') // strip trailing slash
        this.operation = config.operation

        const op = OPERATIONS[config.operation]
        if (!op) {
            throw new Error(`Unknown AgentLine operation: ${config.operation}`)
        }

        // Build a descriptive name for the LLM
        this.name = `agentline_${config.operation}`
        this.description = `${op.description}. Input: ${op.inputDescription}`
    }

    /** Called by the LLM agent when it decides to use this tool */
    async _call(input: string): Promise<string> {
        const op = OPERATIONS[this.operation]
        if (!op) {
            return JSON.stringify({ error: `Unknown operation: ${this.operation}` })
        }

        let params: Record<string, any> = {}
        try {
            const trimmed = (input || '').trim()
            if (trimmed && trimmed !== '{}') {
                params = JSON.parse(trimmed)
            }
        } catch {
            // If input isn't valid JSON, treat it as a raw string (some LLMs pass plain text)
            if (input && input.trim()) {
                params = { input: input.trim() }
            }
        }

        // Resolve path parameters like {id}
        let path = op.path
        if (path.includes('{id}')) {
            const id = params.id || params.agent_id || params.call_id
            if (!id) {
                return JSON.stringify({
                    error: 'Missing required parameter: id. Please provide the resource ID.'
                })
            }
            path = path.replace('{id}', encodeURIComponent(String(id)))
            // Remove id from body params since it's in the URL
            delete params.id
        }

        const url = `${this.baseUrl}${path}`
        const headers: Record<string, string> = {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
        }

        const fetchOptions: RequestInit = {
            method: op.method,
            headers
        }

        if (op.requiresBody && Object.keys(params).length > 0) {
            fetchOptions.body = JSON.stringify(params)
        }

        try {
            const response = await fetch(url, fetchOptions)
            const responseText = await response.text()

            if (!response.ok) {
                let errorDetail = responseText
                try {
                    const errorJson = JSON.parse(responseText)
                    errorDetail = errorJson.detail || errorJson.message || errorJson.error || responseText
                } catch {
                    // Use raw text
                }
                return JSON.stringify({
                    error: `AgentLine API error (${response.status}): ${errorDetail}`
                })
            }

            // Try to parse as JSON for clean output
            try {
                const json = JSON.parse(responseText)
                return JSON.stringify(json, null, 2)
            } catch {
                return responseText
            }
        } catch (error: any) {
            return JSON.stringify({
                error: `Failed to call AgentLine API: ${error.message || String(error)}`
            })
        }
    }
}

/**
 * Returns the list of available operation names and their descriptions.
 * Used by the node definition to populate the dropdown.
 */
export function getOperationOptions(): Array<{ label: string; name: string; description?: string }> {
    return Object.entries(OPERATIONS).map(([name, op]) => ({
        label: op.description.split(' on ')[0].split(' from ')[0], // Short label
        name,
        description: op.description
    }))
}
