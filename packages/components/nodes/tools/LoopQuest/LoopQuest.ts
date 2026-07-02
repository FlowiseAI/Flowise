import { z } from 'zod/v3'
import axios from 'axios'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { buildTaskBody, verdictToString, TaskStatus } from './core'

class LoopQuest_Tools implements INode {
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
        this.label = 'LoopQuest Human Review'
        this.name = 'loopQuest'
        this.version = 1.0
        this.type = 'LoopQuest'
        this.icon = 'loopquest.svg'
        this.category = 'Tools'
        this.description =
            "Send the agent's output to a human for review and wait for their verdict (approve/flag) before continuing."
        this.baseClasses = [this.type, 'Tool']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['loopQuestApi']
        }
        this.inputs = [
            {
                label: 'Game',
                name: 'module',
                type: 'options',
                default: 'swiper',
                description: 'How the reviewer sees the item.',
                options: [
                    { label: 'Swiper — approve or reject', name: 'swiper' },
                    { label: 'Versus — pick the better of two', name: 'versus' },
                    { label: 'Sorter — bucket into categories', name: 'sorter' },
                    { label: 'Detective — spot the problem', name: 'detective' },
                    { label: 'Fixer — correct the output', name: 'fixer' },
                    { label: 'Redact — mask sensitive text', name: 'redact' },
                    { label: 'Grounding — verify a claim against a source', name: 'grounding' }
                ]
            },
            {
                label: 'Mode',
                name: 'mode',
                type: 'options',
                default: 'gate',
                description:
                    'Gate blocks the agent until a human decides. Monitor creates the review and returns immediately without waiting.',
                options: [
                    { label: 'Gate — wait for a human verdict', name: 'gate' },
                    { label: 'Monitor — review in the background', name: 'monitor' }
                ]
            },
            {
                label: 'Gate timeout (seconds)',
                name: 'timeoutSeconds',
                type: 'number',
                default: 3600,
                optional: true,
                description: 'Server-side fail-closed timeout for the gate (30–2592000). On timeout it escalates.'
            },
            {
                label: 'Max wait (seconds)',
                name: 'maxWaitSeconds',
                type: 'number',
                default: 300,
                optional: true,
                additionalParams: true,
                description: 'How long this tool blocks polling for a verdict before returning a fail-closed result.'
            },
            {
                label: 'Poll interval (seconds)',
                name: 'pollSeconds',
                type: 'number',
                default: 5,
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('loopQuestApiKey', credentialData, nodeData)
        const baseUrl = (getCredentialParam('baseUrl', credentialData, nodeData) || 'https://loopquest.tomphillips.uk').replace(
            /\/+$/,
            ''
        )
        const gameModule = (nodeData.inputs?.module as string) || 'swiper'
        const mode = (nodeData.inputs?.mode as string) || 'gate'
        const timeoutSeconds = Number(nodeData.inputs?.timeoutSeconds) || 3600
        const maxWaitSeconds = Number(nodeData.inputs?.maxWaitSeconds) || 300
        const pollSeconds = Number(nodeData.inputs?.pollSeconds) || 5
        const headers = { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' }

        return new DynamicStructuredTool({
            name: 'request_human_review',
            description:
                'Send content to a human reviewer and wait for their verdict. Use before any consequential or irreversible action.',
            schema: z.object({
                content: z.string().describe('The output or decision a human should review.'),
                title: z.string().optional().describe('Optional short heading for the reviewer.'),
                claim: z.string().optional().describe('Grounding game only: the claim to verify.'),
                source: z.string().optional().describe('Grounding game only: the source text to check the claim against.')
            }),
            func: async (input: { content: string; title?: string; claim?: string; source?: string }) => {
                const body = buildTaskBody(input, {
                    module: gameModule,
                    mode,
                    timeoutSeconds,
                    onTimeout: 'escalate',
                    source: 'flowise'
                })
                const created = await axios.post(`${baseUrl}/api/v1/tasks`, body, { headers })
                const taskId = created.data?.id
                if (!taskId) return 'Failed to create the review task.'
                if (mode !== 'gate') return `Review task ${taskId} created (monitor mode) — not waiting for a verdict.`

                const deadline = Date.now() + maxWaitSeconds * 1000
                while (Date.now() < deadline) {
                    await new Promise((r) => setTimeout(r, pollSeconds * 1000))
                    const res = await axios.get(`${baseUrl}/api/v1/tasks/${taskId}`, { headers })
                    const verdict = verdictToString(res.data as TaskStatus)
                    if (verdict) return verdict
                }
                return 'No human verdict within the wait window — treat as NOT approved (fail closed).'
            }
        })
    }
}

module.exports = { nodeClass: LoopQuest_Tools }
