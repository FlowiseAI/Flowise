import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { streamTTS } from './core'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

class CambTTSTool extends Tool {
    name = 'camb_tts'
    description = 'Convert text to speech using CAMB AI. Supports 140+ languages and multiple voice models. Returns the file path to the generated audio.'
    apiKey: string
    language: string
    voiceId: number
    speechModel: string

    constructor(apiKey: string, language: string, voiceId: number, speechModel: string) {
        super()
        this.apiKey = apiKey
        this.language = language
        this.voiceId = voiceId
        this.speechModel = speechModel
    }

    async _call(input: string): Promise<string> {
        const body: Record<string, any> = {
            text: input,
            language: this.language,
            voice_id: this.voiceId,
            speech_model: this.speechModel,
            output_configuration: { format: 'wav' }
        }

        const audioBuffer = await streamTTS({ apiKey: this.apiKey }, body)
        const tmpFile = path.join(os.tmpdir(), `camb_tts_${Date.now()}.wav`)
        fs.writeFileSync(tmpFile, audioBuffer)
        return `Audio saved to: ${tmpFile}`
    }
}

class CambTTS_Tools implements INode {
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
        this.label = 'CAMB AI Text-to-Speech'
        this.name = 'cambTTS'
        this.version = 1.0
        this.type = 'CambTTS'
        this.icon = 'camb-ai.svg'
        this.category = 'Tools'
        this.description = 'Convert text to speech using CAMB AI with 140+ languages'
        this.baseClasses = [this.type, ...getBaseClasses(CambTTSTool)]
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
                type: 'string',
                default: 'en-us',
                description: 'BCP-47 language code (e.g. en-us, fr-fr)',
                optional: true
            },
            {
                label: 'Voice ID',
                name: 'voiceId',
                type: 'number',
                default: 147320,
                description: 'Voice ID for speech synthesis',
                optional: true
            },
            {
                label: 'Speech Model',
                name: 'speechModel',
                type: 'options',
                options: [
                    { label: 'Mars Flash', name: 'mars-flash' },
                    { label: 'Mars Pro', name: 'mars-pro' },
                    { label: 'Mars Instruct', name: 'mars-instruct' }
                ],
                default: 'mars-flash',
                description: 'The speech model to use',
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('cambApiKey', credentialData, nodeData)
        const language = (nodeData.inputs?.language as string) || 'en-us'
        const voiceId = parseInt((nodeData.inputs?.voiceId as string) || '147320', 10)
        const speechModel = (nodeData.inputs?.speechModel as string) || 'mars-flash'

        return new CambTTSTool(apiKey, language, voiceId, speechModel)
    }
}

module.exports = { nodeClass: CambTTS_Tools }
