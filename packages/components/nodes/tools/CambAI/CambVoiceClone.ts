import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { cambFetch } from './core'
import * as fs from 'fs'
import * as path from 'path'

class CambVoiceCloneTool extends Tool {
    name = 'camb_voice_clone'
    description = 'Clone a voice from an audio sample using CAMB AI. Input should be a JSON string with voice_name and audio_file_path fields.'
    apiKey: string

    constructor(apiKey: string) {
        super()
        this.apiKey = apiKey
    }

    async _call(input: string): Promise<string> {
        let params: { voice_name: string; audio_file_path: string; gender?: number; age?: number }
        try {
            params = JSON.parse(input)
        } catch {
            return JSON.stringify({ error: 'Input must be JSON with voice_name and audio_file_path' })
        }

        const filePath = params.audio_file_path
        if (!fs.existsSync(filePath)) {
            return JSON.stringify({ error: `Audio file not found: ${filePath}` })
        }

        const fileBuffer = fs.readFileSync(filePath)
        const fileName = path.basename(filePath)

        const formData = new FormData()
        formData.append('voice_name', params.voice_name)
        formData.append('gender', String(params.gender || 0))
        formData.append('age', String(params.age || 30))
        formData.append('file', new Blob([fileBuffer]), fileName)

        const res = await cambFetch('/create-custom-voice', { apiKey: this.apiKey }, {
            method: 'POST',
            body: formData
        })

        if (!res.ok) {
            throw new Error(`CAMB AI Voice Clone error (${res.status}): ${await res.text()}`)
        }

        const result = await res.json()
        return JSON.stringify({
            voice_id: result.voice_id || result.id,
            voice_name: params.voice_name,
            status: 'created'
        }, null, 2)
    }
}

class CambVoiceClone_Tools implements INode {
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
        this.label = 'CAMB AI Voice Clone'
        this.name = 'cambVoiceClone'
        this.version = 1.0
        this.type = 'CambVoiceClone'
        this.icon = 'camb-ai.svg'
        this.category = 'Tools'
        this.description = 'Clone a voice from an audio sample using CAMB AI'
        this.baseClasses = [this.type, ...getBaseClasses(CambVoiceCloneTool)]
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
        return new CambVoiceCloneTool(apiKey)
    }
}

module.exports = { nodeClass: CambVoiceClone_Tools }
