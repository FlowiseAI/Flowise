import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, stripHTMLFromToolInput, getCredentialParam, getCredentialData } from '../../../src/utils'
import { desc, X402PaymentTool, X402PaymentParameters } from './core'

class X402Payment_Tools implements INode {
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
        this.label = 'x402 Payment'
        this.name = 'x402Payment'
        this.version = 1.0
        this.type = 'X402Payment'
        this.icon = 'payment.svg'
        this.category = 'Tools'
        this.description = 'Call paid APIs using x402 HTTP 402 payment protocol'
        this.baseClasses = [this.type, ...getBaseClasses(X402PaymentTool), 'Tool']
        this.credential = {
            label: 'Connect Wallet',
            name: 'credential',
            type: 'credential',
            credentialNames: ['x402Wallet']
        }
        this.inputs = [
            {
                label: 'API Endpoint URL',
                name: 'endpointUrl',
                type: 'string',
                acceptVariable: true,
                description: 'The API endpoint URL to call'
            },
            {
                label: 'Name',
                name: 'toolName',
                type: 'string',
                default: 'x402_payment',
                description: 'Name of the tool',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Description',
                name: 'toolDescription',
                type: 'string',
                rows: 4,
                default: desc,
                description: 'Describe to LLM when it should use this tool',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Maximum Price',
                name: 'maxPrice',
                type: 'number',
                default: 10,
                description: 'Maximum price in USDC to pay for API calls',
                step: 0.01,
                additionalParams: true,
                optional: true
            },
            {
                label: 'Headers',
                name: 'headers',
                type: 'string',
                rows: 4,
                acceptVariable: true,
                additionalParams: true,
                optional: true,
                placeholder: `{
    "Authorization": "Bearer <token>"
}`
            },
            {
                label: 'Max Output Length',
                name: 'maxOutputLength',
                type: 'number',
                description: 'Max length of the output. Remove this if you want to return the entire response',
                step: 1,
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: any): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)

        const network = getCredentialParam('network', credentialData, nodeData) as 'solana' | 'base' || 'solana'
        const privateKey = getCredentialParam('privateKey', credentialData, nodeData) as string

        if (!privateKey) {
            throw new Error('Private key is required for x402 payment')
        }

        const inputUrl = (nodeData.inputs?.endpointUrl as string) || ''
        const toolName = (nodeData.inputs?.toolName as string) || 'x402_payment'
        const toolDescription = (nodeData.inputs?.toolDescription as string) || desc
        const maxPrice = (nodeData.inputs?.maxPrice as number) || 10
        const headers = (nodeData.inputs?.headers as string) || '{}'
        const maxOutputLength = (nodeData.inputs?.maxOutputLength as number) || Infinity

        const obj: X402PaymentParameters = {
            url: stripHTMLFromToolInput(inputUrl),
            name: toolName
                .toLowerCase()
                .replace(/ /g, '_')
                .replace(/[^a-z0-9_-]/g, ''),
            description: toolDescription,
            maxPrice: maxPrice,
            network: network,
            privateKey: privateKey,
            maxOutputLength: maxOutputLength
        }

        if (headers) {
            try {
                const parsedHeaders = typeof headers === 'object' ? headers : JSON.parse(stripHTMLFromToolInput(headers))
                obj.headers = parsedHeaders
            } catch (e) {
                throw new Error('Invalid headers JSON format')
            }
        }

        return new X402PaymentTool(obj)
    }
}

module.exports = { nodeClass: X402Payment_Tools }
