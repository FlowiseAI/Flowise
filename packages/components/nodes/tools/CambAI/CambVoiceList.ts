import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { cambFetch } from './core'

class CambVoiceListTool extends Tool {
    name = 'camb_list_voices'
    description = 'List all available voices from CAMB AI. Returns JSON array with voice IDs and names.'
    apiKey: string

    constructor(apiKey: string) {
        super()
        this.apiKey = apiKey
    }

    async _call(_input: string): Promise<string> {
        const res = await cambFetch('/list-voices', { apiKey: this.apiKey })
        if (!res.ok) {
            throw new Error(`CAMB AI Voice List error (${res.status}): ${await res.text()}`)
        }

        const voices = await res.json()
        const formatted = Array.isArray(voices)
            ? voices.map((v: any) => ({
                  id: v.id,
                  voice_name: v.voice_name || v.name || 'Unknown'
              }))
            : voices

        return JSON.stringify(formatted, null, 2)
    }
}

class CambVoiceList_Tools implements INode {
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
        this.label = 'CAMB AI Voice List'
        this.name = 'cambVoiceList'
        this.version = 1.0
        this.type = 'CambVoiceList'
        this.icon = 'camb-ai.svg'
        this.category = 'Tools'
        this.description = 'List all available voices from CAMB AI'
        this.baseClasses = [this.type, ...getBaseClasses(CambVoiceListTool)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['cambAIApi']
        }
        this.inputs = []
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('cambApiKey', credentialData, nodeData)
        return new CambVoiceListTool(apiKey)
    }
}

module.exports = { nodeClass: CambVoiceList_Tools }
