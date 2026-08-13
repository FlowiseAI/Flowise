import { DynamicStructuredTool } from '../OpenAPIToolkit/core'
import { z } from 'zod/v3'
import { secureFetch } from '../../../src/httpSecurity'
import { getBaseClasses, getCredentialData, getCredentialParam, handleErrorMessage } from '../../../src/utils'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

class TelnyxVerifySendTool extends DynamicStructuredTool {
    constructor(apiKey: string, defaultVerifyProfileId?: string) {
        super({
            name: 'telnyx_verify_send',
            description: 'Send a verification code with Telnyx Verify. Use this to start an OTP verification flow for a phone number.',
            schema: z.object({
                phoneNumber: z.string().describe('Destination phone number in E.164 format'),
                verifyProfileId: z.string().optional().describe('Telnyx Verify Profile ID to use for this verification request'),
                channel: z.enum(['sms', 'call']).optional().describe('Verification channel to use when delivering the OTP code')
            }),
            baseUrl: '',
            method: 'POST',
            headers: {}
        })
        this.apiKey = apiKey
        this.defaultVerifyProfileId = defaultVerifyProfileId
    }

    apiKey: string
    defaultVerifyProfileId?: string

    async _call(arg: any): Promise<string> {
        const verifyProfileId = arg.verifyProfileId || this.defaultVerifyProfileId
        if (!verifyProfileId) {
            throw new Error('Telnyx Verify Send requires a Verify Profile ID')
        }

        const body = {
            phone_number: arg.phoneNumber,
            verify_profile_id: verifyProfileId,
            channel: arg.channel || 'sms'
        }

        try {
            const res = await secureFetch('https://api.telnyx.com/v2/verifications', {
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

class TelnyxVerifySend_Tools implements INode {
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
        this.label = 'Telnyx Verify Send'
        this.name = 'telnyxVerifySend'
        this.version = 1.0
        this.type = 'TelnyxVerifySend'
        this.icon = 'telnyx.png'
        this.category = 'Tools'
        this.description = 'Start an OTP verification flow through the Telnyx Verify API.'
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(TelnyxVerifySendTool)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['telnyxApi']
        }
        this.inputs = [
            {
                label: 'Default Verify Profile ID',
                name: 'verifyProfileId',
                type: 'string',
                description: 'Optional default Telnyx Verify Profile ID used when sending OTP codes.',
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('apiKey', credentialData, nodeData)
        const verifyProfileId = nodeData.inputs?.verifyProfileId as string | undefined
        return new TelnyxVerifySendTool(apiKey, verifyProfileId)
    }
}

module.exports = { nodeClass: TelnyxVerifySend_Tools }
