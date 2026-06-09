import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { buildResembleTools } from './core'

class Resemble_Tools implements INode {
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
        this.label = 'Resemble Detect + Intelligence'
        this.name = 'resembleDetectIntelligence'
        this.version = 1.0
        this.type = 'Resemble'
        this.icon = 'resemble.svg'
        this.category = 'Tools'
        this.description =
            'Resemble AI deepfake detection, media intelligence, and watermarking. Exposes detect, intelligence, and watermark tools to an agent.'
        this.baseClasses = ['Tool']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['resembleApi']
        }
        this.inputs = [
            {
                label: 'API Base URL',
                name: 'baseUrl',
                type: 'string',
                optional: true,
                additionalParams: true,
                placeholder: 'https://app.resemble.ai/api/v2',
                description: 'Override only for self-hosted / enterprise endpoints.'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('resembleApiKey', credentialData, nodeData)
        const baseUrl = (nodeData.inputs?.baseUrl as string) || undefined
        if (!apiKey) throw new Error('Resemble API key is required. Connect the Resemble credential.')
        return buildResembleTools({ apiKey, baseUrl })
    }
}

module.exports = { nodeClass: Resemble_Tools }
