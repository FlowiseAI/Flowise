import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { cambPost, pollTask, getTTSResult } from './core'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

class CambTranslatedTTSTool extends Tool {
    name = 'camb_translated_tts'
    description = 'Translate text and convert to speech in one step using CAMB AI. Returns the file path to the generated audio.'
    apiKey: string
    sourceLanguage: number
    targetLanguage: number
    voiceId: number

    constructor(apiKey: string, sourceLanguage: number, targetLanguage: number, voiceId: number) {
        super()
        this.apiKey = apiKey
        this.sourceLanguage = sourceLanguage
        this.targetLanguage = targetLanguage
        this.voiceId = voiceId
    }

    async _call(input: string): Promise<string> {
        const config = { apiKey: this.apiKey }
        const body = {
            text: input,
            source_language: this.sourceLanguage,
            target_language: this.targetLanguage,
            voice_id: this.voiceId
        }

        const result = await cambPost('/translated-tts', config, body)
        const taskId = result.task_id

        const status = await pollTask(`/translated-tts/${taskId}`, config)
        const runId = status.run_id

        const audioBuffer = await getTTSResult(runId, config)
        const tmpFile = path.join(os.tmpdir(), `camb_translated_tts_${Date.now()}.wav`)
        fs.writeFileSync(tmpFile, audioBuffer)
        return `Audio saved to: ${tmpFile}`
    }
}

class CambTranslatedTTS_Tools implements INode {
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
        this.label = 'CAMB AI Translated TTS'
        this.name = 'cambTranslatedTTS'
        this.version = 1.0
        this.type = 'CambTranslatedTTS'
        this.icon = 'camb-ai.svg'
        this.category = 'Tools'
        this.description = 'Translate text and convert to speech in one step using CAMB AI'
        this.baseClasses = [this.type, ...getBaseClasses(CambTranslatedTTSTool)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['cambAIApi']
        }
        this.inputs = [
            {
                label: 'Source Language',
                name: 'sourceLanguage',
                type: 'number',
                default: 1,
                description: 'Source language code (integer)'
            },
            {
                label: 'Target Language',
                name: 'targetLanguage',
                type: 'number',
                default: 2,
                description: 'Target language code (integer)'
            },
            {
                label: 'Voice ID',
                name: 'voiceId',
                type: 'number',
                default: 147320,
                description: 'Voice ID for TTS output',
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('cambApiKey', credentialData, nodeData)
        const sourceLanguage = parseInt((nodeData.inputs?.sourceLanguage as string) || '1', 10)
        const targetLanguage = parseInt((nodeData.inputs?.targetLanguage as string) || '2', 10)
        const voiceId = parseInt((nodeData.inputs?.voiceId as string) || '147320', 10)

        return new CambTranslatedTTSTool(apiKey, sourceLanguage, targetLanguage, voiceId)
    }
}

module.exports = { nodeClass: CambTranslatedTTS_Tools }
