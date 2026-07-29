import { z } from 'zod/v3'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { DynamicStructuredTool } from '../CustomTool/core'

const code = `
const url = 'https://api.ip2geo.dev/convert?ip=' + encodeURIComponent($ip_address);

const response = await fetch(url, {
    headers: {
        'X-Api-Key': $vars.apiKey,
    },
});

const data = await response.json();

if (!data.success) {
    return { error: data.message || 'Request failed' };
}

return data.data;
`

class Ip2Geo_Tools implements INode {
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
        this.label = 'ip2geo'
        this.name = 'ip2Geo'
        this.version = 1.0
        this.type = 'Ip2Geo'
        this.icon = 'ip2geo.svg'
        this.category = 'Tools'
        this.description = 'Convert IP addresses into geolocation data using ip2geo.dev'
        this.baseClasses = [this.type, 'Tool']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['ip2GeoApi']
        }
        this.inputs = [
            {
                label: 'IP Address',
                name: 'ipAddress',
                type: 'string',
                description: 'The IP address to look up. Leave empty to let the LLM provide it.',
                optional: true,
                acceptVariable: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('ip2GeoApiKey', credentialData, nodeData)
        const defaultIp = nodeData.inputs?.ipAddress as string

        const obj = {
            name: 'ip2geo_lookup',
            description:
                'Look up geolocation data for an IP address. Returns city, country, coordinates, timezone, ASN, and currency. Input should be an IPv4 or IPv6 address.',
            schema: z.object({
                ip_address: z.string().describe('The IPv4 or IPv6 address to look up')
            }),
            code: code,
            variables: [
                {
                    name: 'apiKey',
                    type: 'static',
                    value: apiKey
                }
            ]
        }

        const dynamicStructuredTool = new DynamicStructuredTool(obj)

        return dynamicStructuredTool
    }
}

module.exports = { nodeClass: Ip2Geo_Tools }
