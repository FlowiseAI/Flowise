import { DynamicStructuredTool } from '../OpenAPIToolkit/core'
import { z } from 'zod/v3'
import { secureFetch } from '../../../src/httpSecurity'
import { getBaseClasses, getCredentialData, getCredentialParam, handleErrorMessage } from '../../../src/utils'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

class TelnyxNumberLookupTool extends DynamicStructuredTool {
    constructor(apiKey: string) {
        super({
            name: 'telnyx_number_lookup',
            description: 'Look up a phone number with Telnyx. Use this to validate a number, inspect carrier details, and understand the line type before sending or calling.',
            schema: z.object({
                phoneNumber: z.string().describe('Phone number to lookup in E.164 format')
            }),
            baseUrl: '',
            method: 'GET',
            headers: {}
        })
        this.apiKey = apiKey
    }

    apiKey: string

    async _call(arg: any): Promise<string> {
        try {
            const url = `https://api.telnyx.com/v2/number_lookup/${encodeURIComponent(arg.phoneNumber)}`
            const res = await secureFetch(url, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
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

class TelnyxNumberLookup_Tools implements INode {
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
        this.label = 'Telnyx Number Lookup'
        this.name = 'telnyxNumberLookup'
        this.version = 1.0
        this.type = 'TelnyxNumberLookup'
        this.icon = 'telnyx.png'
        this.category = 'Tools'
        this.description = 'Validate a phone number and fetch carrier and line type data through the Telnyx Number Lookup API.'
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(TelnyxNumberLookupTool)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['telnyxApi']
        }
        this.inputs = []
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('apiKey', credentialData, nodeData)
        return new TelnyxNumberLookupTool(apiKey)
    }
}

module.exports = { nodeClass: TelnyxNumberLookup_Tools }
