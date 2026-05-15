import { DynamicStructuredTool } from '../OpenAPIToolkit/core'
import { z } from 'zod/v3'
import { secureFetch } from '../../../src/httpSecurity'
import { getBaseClasses, getCredentialData, getCredentialParam, handleErrorMessage } from '../../../src/utils'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

class TelnyxVerifyCheckTool extends DynamicStructuredTool {
    constructor(apiKey: string, defaultVerifyProfileId?: string) {
        super({
            name: 'telnyx_verify_check',
            description: 'Check a verification code with Telnyx Verify. Use this to validate an OTP submitted by a user for a phone number.',
            schema: z.object({
                phoneNumber: z.string().describe('Phone number in E.164 format'),
                code: z.string().describe('Verification code submitted by the user'),
                verifyProfileId: z.string().optional().describe('Telnyx Verify Profile ID to use when checking the OTP code')
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
            throw new Error('Telnyx Verify Check requires a Verify Profile ID')
        }

        const body = {
            phone_number: arg.phoneNumber,
            verify_profile_id: verifyProfileId,
            code: arg.code
        }

        try {
            const res = await secureFetch('https://api.telnyx.com/v2/verifications/by_phone_number/actions/verify', {
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

class TelnyxVerifyCheck_Tools implements INode {
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
        this.label = 'Telnyx Verify Check'
        this.name = 'telnyxVerifyCheck'
        this.version = 1.0
        this.type = 'TelnyxVerifyCheck'
        this.icon = 'telnyx.png'
        this.category = 'Tools'
        this.description = 'Validate OTP codes through the Telnyx Verify API after the user submits a verification code.'
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(TelnyxVerifyCheckTool)]
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
                description: 'Optional default Telnyx Verify Profile ID used when validating OTP codes.',
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('apiKey', credentialData, nodeData)
        const verifyProfileId = nodeData.inputs?.verifyProfileId as string | undefined
        return new TelnyxVerifyCheckTool(apiKey, verifyProfileId)
    }
}

module.exports = { nodeClass: TelnyxVerifyCheck_Tools }
