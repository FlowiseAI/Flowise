import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { cambPostMultipart, pollTask, cambFetch } from './core'

class CambAudioSeparationTool extends Tool {
    name = 'camb_audio_separation'
    description = 'Separate vocals/speech from background audio using CAMB AI. Provide an audio URL. Returns JSON with URLs for separated vocals and background audio.'
    apiKey: string

    constructor(apiKey: string) {
        super()
        this.apiKey = apiKey
    }

    async _call(input: string): Promise<string> {
        const config = { apiKey: this.apiKey }

        // Download audio from URL, then upload via multipart (API requires file upload)
        const audioRes = await fetch(input.trim())
        if (!audioRes.ok) {
            throw new Error(`Failed to download audio from ${input}: ${audioRes.status}`)
        }
        const audioBuffer = await audioRes.arrayBuffer()
        const formData = new FormData()
        formData.append('media_file', new Blob([audioBuffer]), 'audio.mp3')

        const result = await cambPostMultipart('/audio-separation', config, formData)
        const taskId = result.task_id

        const status = await pollTask(`/audio-separation/${taskId}`, config)
        const runId = status.run_id

        // Get separation result
        const res = await cambFetch(`/audio-separation-result/${runId}`, config)
        if (!res.ok) {
            throw new Error(`CAMB AI Audio Separation result error (${res.status}): ${await res.text()}`)
        }

        const sepResult = await res.json()
        return JSON.stringify({
            foreground_audio_url: sepResult.foreground_audio_url || null,
            background_audio_url: sepResult.background_audio_url || null,
            status: 'completed'
        }, null, 2)
    }
}

class CambAudioSeparation_Tools implements INode {
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
        this.label = 'CAMB AI Audio Separation'
        this.name = 'cambAudioSeparation'
        this.version = 1.0
        this.type = 'CambAudioSeparation'
        this.icon = 'camb-ai.svg'
        this.category = 'Tools'
        this.description = 'Separate vocals from background audio using CAMB AI'
        this.baseClasses = [this.type, ...getBaseClasses(CambAudioSeparationTool)]
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
        return new CambAudioSeparationTool(apiKey)
    }
}

module.exports = { nodeClass: CambAudioSeparation_Tools }
