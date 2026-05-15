import { DynamicStructuredTool } from '../OpenAPIToolkit/core'
import { z } from 'zod/v3'
import { secureFetch } from '../../../src/httpSecurity'
import { getBaseClasses, getCredentialData, getCredentialParam, handleErrorMessage } from '../../../src/utils'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

class TelnyxMessagingTool extends DynamicStructuredTool {
    constructor(apiKey: string, defaultFrom?: string, defaultMessagingProfileId?: string) {
        super({
            name: 'telnyx_send_sms',
            description: 'Send an SMS message through Telnyx. Use this tool when you need to send a text message to a phone number in E.164 format.',
            schema: z.object({
                to: z.string().describe('Destination phone number in E.164 format'),
                text: z.string().describe('Text message body to send to the destination number'),
                from: z.string().optional().describe('Sender phone number in E.164 format'),
                messagingProfileId: z.string().optional().describe('Telnyx Messaging Profile ID to use for sending the message')
            }),
            baseUrl: '',
            method: 'POST',
            headers: {}
        })
        this.apiKey = apiKey
        this.defaultFrom = defaultFrom
        this.defaultMessagingProfileId = defaultMessagingProfileId
    }

    apiKey: string
    defaultFrom?: string
    defaultMessagingProfileId?: string

    async _call(arg: any): Promise<string> {
        const from = arg.from || this.defaultFrom
        const messagingProfileId = arg.messagingProfileId || this.defaultMessagingProfileId

        if (!from && !messagingProfileId) {
            throw new Error('Telnyx Messaging requires either a From number or a Messaging Profile ID')
        }

        const body: Record<string, any> = {
            to: arg.to,
            text: arg.text
        }

        if (from) body.from = from
        if (messagingProfileId) body.messaging_profile_id = messagingProfileId

        try {
            const res = await secureFetch('https://api.telnyx.com/v2/messages', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            })

            const text = await res.text()
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${text}`)
            }
            return text
        } catch (error) {
            throw new Error(handleErrorMessage(error))
        }
    }
}

class TelnyxMessaging_Tools implements INode {
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
        this.label = 'Telnyx Messaging'
        this.name = 'telnyxMessaging'
        this.version = 1.0
        this.type = 'TelnyxMessaging'
        this.icon = 'telnyx.png'
        this.category = 'Tools'
        this.description = 'Send outbound SMS messages through the Telnyx Messaging API.'
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(TelnyxMessagingTool)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['telnyxApi']
        }
        this.inputs = [
            {
                label: 'Default From Number',
                name: 'from',
                type: 'string',
                description: 'Optional default sender number in E.164 format. Either this value or a Messaging Profile ID is required to send a message.',
                optional: true
            },
            {
                label: 'Default Messaging Profile ID',
                name: 'messagingProfileId',
                type: 'string',
                description: 'Optional default Telnyx Messaging Profile ID. Use this if you prefer profile-based sending instead of providing a from number.',
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('apiKey', credentialData, nodeData)
        const from = nodeData.inputs?.from as string | undefined
        const messagingProfileId = nodeData.inputs?.messagingProfileId as string | undefined
        return new TelnyxMessagingTool(apiKey, from, messagingProfileId)
    }
}

module.exports = { nodeClass: TelnyxMessaging_Tools }
