import axios from 'axios'
import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../../src/utils'

class PlivoMakeCallTool extends Tool {
    name = 'plivo_make_call'
    description =
        'Place an outbound phone call through Plivo. The input to this tool is the destination phone number to call in E.164 format. Leave the input empty to call the number configured on the node.'
    private authId: string
    private authToken: string
    private from: string
    private to: string
    private answerUrl: string

    constructor(authId: string, authToken: string, from: string, to: string, answerUrl: string) {
        super()
        this.authId = authId
        this.authToken = authToken
        this.from = from
        this.to = to
        this.answerUrl = answerUrl
    }

    async _call(input: string): Promise<string> {
        try {
            const destination = (input || '').trim() || this.to
            if (!destination) {
                return 'Failed to place call: no destination number provided'
            }

            const endpoint = `https://api.plivo.com/v1/Account/${this.authId}/Call/`

            const response = await axios.post(
                endpoint,
                {
                    from: this.from,
                    to: destination,
                    answer_url: this.answerUrl
                },
                {
                    auth: { username: this.authId, password: this.authToken },
                    validateStatus: () => true
                }
            )

            const data = response.data

            if (response.status !== 201) {
                return `Failed to place call (HTTP ${response.status}): ${JSON.stringify(data)}`
            }

            return `Successfully placed call to ${destination}. Request UUID: ${data.request_uuid}`
        } catch (error) {
            return `Failed to place call: ${error instanceof Error ? error.message : String(error)}`
        }
    }
}

class PlivoMakeCall_Tools implements INode {
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
        this.label = 'Plivo Make Call'
        this.name = 'plivoMakeCall'
        this.version = 1.0
        this.type = 'PlivoMakeCall'
        this.icon = 'plivo.svg'
        this.category = 'Tools'
        this.description = 'Place an outbound phone call using the Plivo Voice API'
        this.baseClasses = [this.type, ...getBaseClasses(PlivoMakeCallTool)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['plivoApi']
        }
        this.inputs = [
            {
                label: 'From Number',
                name: 'from',
                type: 'string',
                placeholder: '+14150000002',
                description: 'The caller ID, a Plivo phone number in E.164 format'
            },
            {
                label: 'To Number',
                name: 'to',
                type: 'string',
                placeholder: '+14150000001',
                description: 'Default destination number in E.164 format. Can be overridden by the tool input at runtime',
                optional: true
            },
            {
                label: 'Answer URL',
                name: 'answerUrl',
                type: 'string',
                placeholder: 'https://example.com/answer',
                description: 'URL Plivo fetches on answer to retrieve the call-flow XML'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const authId = getCredentialParam('authId', credentialData, nodeData)
        const authToken = getCredentialParam('authToken', credentialData, nodeData)
        const from = nodeData.inputs?.from as string
        const to = nodeData.inputs?.to as string
        const answerUrl = nodeData.inputs?.answerUrl as string

        if (!authId || !authToken) {
            throw new Error('Plivo Auth ID and Auth Token are required')
        }
        if (!from) {
            throw new Error('From Number is required')
        }
        if (!answerUrl) {
            throw new Error('Answer URL is required')
        }

        return new PlivoMakeCallTool(authId, authToken, from, to, answerUrl)
    }
}

module.exports = { nodeClass: PlivoMakeCall_Tools }
