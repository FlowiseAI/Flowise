import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import axios from 'axios'

class ComposioTrigger implements INode {
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
        this.label = 'Composio Trigger'
        this.name = 'composioTrigger'
        this.version = 1.0
        this.type = 'ComposioTrigger'
        this.icon = 'composio.svg'
        this.category = 'Triggers'
        this.description = 'Trigger workflows from Composio events like new emails, calendar events, etc.'
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Composio API Key',
                name: 'composioApiKey',
                type: 'password',
                description: 'Your Composio API Key'
            },
            {
                label: 'Trigger Type',
                name: 'triggerType',
                type: 'options',
                options: [
                    {
                        label: 'New Email Received',
                        name: 'NEW_EMAIL_RECEIVED'
                    },
                    {
                        label: 'Calendar Event Created',
                        name: 'CALENDAR_EVENT_CREATED'
                    },
                    {
                        label: 'Calendar Event Updated',
                        name: 'CALENDAR_EVENT_UPDATED'
                    },
                    {
                        label: 'Notion Page Created',
                        name: 'NOTION_PAGE_CREATED'
                    },
                    {
                        label: 'Notion Page Updated',
                        name: 'NOTION_PAGE_UPDATED'
                    },
                    {
                        label: 'Slack Message Received',
                        name: 'SLACK_MESSAGE_RECEIVED'
                    },
                    {
                        label: 'Custom Webhook',
                        name: 'CUSTOM_WEBHOOK'
                    }
                ],
                description: 'Type of Composio event to trigger on'
            },
            {
                label: 'Filter Conditions',
                name: 'filterConditions',
                type: 'json',
                placeholder: '{"from": "important@example.com"}',
                description: 'JSON object with conditions to filter events (optional)',
                optional: true
            },
            {
                label: 'Webhook URL',
                name: 'webhookUrl',
                type: 'string',
                description: 'The webhook URL that Composio will send events to',
                placeholder: 'https://your-flowise-server.com/api/v1/triggers/{triggerId}/webhook'
            },
            {
                label: 'Description',
                name: 'description',
                type: 'string',
                rows: 3,
                description: 'Description of this trigger for your reference',
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const composioApiKey = nodeData.inputs?.composioApiKey as string
        const triggerType = nodeData.inputs?.triggerType as string
        const filterConditions = nodeData.inputs?.filterConditions
            ? JSON.parse(nodeData.inputs.filterConditions as string)
            : {}
        const webhookUrl = nodeData.inputs?.webhookUrl as string
        const description = nodeData.inputs?.description as string

        // Register the webhook with Composio
        try {
            const response = await axios.post(
                'https://api.composio.dev/v1/webhooks/register',
                {
                    triggerType,
                    filterConditions,
                    webhookUrl,
                    description: description || `Flowise trigger for ${triggerType}`
                },
                {
                    headers: {
                        'Authorization': `Bearer ${composioApiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            )

            // Return the webhook registration info
            return {
                webhookId: response.data.webhookId,
                triggerType,
                webhookUrl,
                status: 'registered'
            }
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(`Composio webhook registration failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`)
            }
            throw new Error(`Error registering Composio webhook: ${error}`)
        }
    }
}

module.exports = { nodeClass: ComposioTrigger }