import axios from 'axios'
import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../../src/utils'

class PlivoSendSMSTool extends Tool {
    name = 'plivo_send_sms'
    description = 'Send an SMS message through Plivo. The input to this tool is the text body of the message to send.'
    private authId: string
    private authToken: string
    private src: string
    private dst: string

    constructor(authId: string, authToken: string, src: string, dst: string) {
        super()
        this.authId = authId
        this.authToken = authToken
        this.src = src
        this.dst = dst
    }

    async _call(input: string): Promise<string> {
        try {
            const text = (input || '').trim()
            if (!text) {
                return 'Failed to send SMS: message text is empty'
            }

            const endpoint = `https://api.plivo.com/v1/Account/${this.authId}/Message/`

            const response = await axios.post(
                endpoint,
                {
                    src: this.src,
                    dst: this.dst,
                    text: text,
                    type: 'sms'
                },
                {
                    auth: { username: this.authId, password: this.authToken },
                    validateStatus: () => true
                }
            )

            const data = response.data

            if (response.status !== 202) {
                return `Failed to send SMS (HTTP ${response.status}): ${JSON.stringify(data)}`
            }

            const messageUuid = Array.isArray(data.message_uuid) ? data.message_uuid.join(', ') : data.message_uuid
            return `Successfully queued SMS to ${this.dst}. Message UUID: ${messageUuid}`
        } catch (error) {
            return `Failed to send SMS: ${error}`
        }
    }
}

class PlivoSendSMS_Tools implements INode {
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
        this.label = 'Plivo Send SMS'
        this.name = 'plivoSendSMS'
        this.version = 1.0
        this.type = 'PlivoSendSMS'
        this.icon = 'plivo.png'
        this.category = 'Tools'
        this.description = 'Send an SMS message using the Plivo Messaging API'
        this.baseClasses = [this.type, ...getBaseClasses(PlivoSendSMSTool)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['plivoApi']
        }
        this.inputs = [
            {
                label: 'From Number',
                name: 'src',
                type: 'string',
                placeholder: '+14150000002',
                description: 'The sender ID, which can be a Plivo phone number, a short code, or an alphanumeric sender ID where permitted'
            },
            {
                label: 'To Number',
                name: 'dst',
                type: 'string',
                placeholder: '+14150000001',
                description: 'Destination number in E.164 format. Multiple recipients are joined with a < character'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const authId = getCredentialParam('authId', credentialData, nodeData)
        const authToken = getCredentialParam('authToken', credentialData, nodeData)
        const src = nodeData.inputs?.src as string
        const dst = nodeData.inputs?.dst as string

        if (!authId || !authToken) {
            throw new Error('Plivo Auth ID and Auth Token are required')
        }
        if (!src) {
            throw new Error('From Number is required')
        }
        if (!dst) {
            throw new Error('To Number is required')
        }

        return new PlivoSendSMSTool(authId, authToken, src, dst)
    }
}

module.exports = { nodeClass: PlivoSendSMS_Tools }
