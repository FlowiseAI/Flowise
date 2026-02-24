import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { cambFetch, cambPostMultipart, pollTask } from './core'

class CambTranscribeTool extends Tool {
    name = 'camb_transcribe'
    description = 'Transcribe audio to text with speaker identification using CAMB AI. Provide an audio URL. Returns JSON with transcription segments.'
    apiKey: string
    language: number

    constructor(apiKey: string, language: number) {
        super()
        this.apiKey = apiKey
        this.language = language
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
        formData.append('language', String(this.language))
        formData.append('media_file', new Blob([audioBuffer]), 'audio.mp3')

        const result = await cambPostMultipart('/transcribe', config, formData)
        const taskId = result.task_id

        // Poll for completion
        const status = await pollTask(`/transcribe/${taskId}`, config)
        const runId = status.run_id

        // Get transcription result (GET with query params)
        const res = await cambFetch(`/transcription-result/${runId}?data_type=json&format_type=txt`, config)
        if (!res.ok) {
            throw new Error(`CAMB AI Transcription result error (${res.status}): ${await res.text()}`)
        }
        const transcription = await res.json()

        return JSON.stringify(transcription, null, 2)
    }
}

class CambTranscribe_Tools implements INode {
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
        this.label = 'CAMB AI Transcribe'
        this.name = 'cambTranscribe'
        this.version = 1.0
        this.type = 'CambTranscribe'
        this.icon = 'camb-ai.svg'
        this.category = 'Tools'
        this.description = 'Transcribe audio to text with speaker identification using CAMB AI'
        this.baseClasses = [this.type, ...getBaseClasses(CambTranscribeTool)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['cambAIApi']
        }
        this.inputs = [
            {
                label: 'Language',
                name: 'language',
                type: 'number',
                default: 1,
                description: 'Language code (integer). 1=English, 2=Spanish, 3=French, etc.'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('cambApiKey', credentialData, nodeData)
        const language = parseInt((nodeData.inputs?.language as string) || '1', 10)

        return new CambTranscribeTool(apiKey, language)
    }
}

module.exports = { nodeClass: CambTranscribe_Tools }
