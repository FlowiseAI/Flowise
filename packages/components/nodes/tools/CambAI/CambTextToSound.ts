import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { cambPost, pollTask, cambFetch } from './core'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

class CambTextToSoundTool extends Tool {
    name = 'camb_text_to_sound'
    description = 'Generate sounds, music, or soundscapes from text descriptions using CAMB AI. Returns the file path to the generated audio.'
    apiKey: string
    audioType: string

    constructor(apiKey: string, audioType: string) {
        super()
        this.apiKey = apiKey
        this.audioType = audioType
    }

    async _call(input: string): Promise<string> {
        const config = { apiKey: this.apiKey }
        const body: Record<string, any> = { prompt: input }
        if (this.audioType) {
            body.audio_type = this.audioType
        }

        const result = await cambPost('/text-to-sound', config, body)
        const taskId = result.task_id

        const status = await pollTask(`/text-to-sound/${taskId}`, config)
        const runId = status.run_id

        // Get audio result
        const res = await cambFetch(`/text-to-sound-result/${runId}`, config)
        if (!res.ok) {
            throw new Error(`CAMB AI Text-to-Sound result error (${res.status}): ${await res.text()}`)
        }

        const audioBuffer = Buffer.from(await res.arrayBuffer())
        const tmpFile = path.join(os.tmpdir(), `camb_sound_${Date.now()}.wav`)
        fs.writeFileSync(tmpFile, audioBuffer)
        return `Audio saved to: ${tmpFile}`
    }
}

class CambTextToSound_Tools implements INode {
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
        this.label = 'CAMB AI Text-to-Sound'
        this.name = 'cambTextToSound'
        this.version = 1.0
        this.type = 'CambTextToSound'
        this.icon = 'camb-ai.svg'
        this.category = 'Tools'
        this.description = 'Generate sounds, music, or soundscapes from text descriptions using CAMB AI'
        this.baseClasses = [this.type, ...getBaseClasses(CambTextToSoundTool)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['cambAIApi']
        }
        this.inputs = [
            {
                label: 'Audio Type',
                name: 'audioType',
                type: 'options',
                options: [
                    { label: 'Sound', name: 'sound' },
                    { label: 'Music', name: 'music' }
                ],
                default: 'sound',
                description: 'Type of audio to generate',
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('cambApiKey', credentialData, nodeData)
        const audioType = (nodeData.inputs?.audioType as string) || 'sound'
        return new CambTextToSoundTool(apiKey, audioType)
    }
}

module.exports = { nodeClass: CambTextToSound_Tools }
