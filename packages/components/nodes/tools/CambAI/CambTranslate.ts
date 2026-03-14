import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { cambFetch } from './core'

class CambTranslateTool extends Tool {
    name = 'camb_translate'
    description = 'Translate text between 140+ languages using CAMB AI. Language codes: 1=English, 2=Spanish, 3=French, 4=German, 5=Italian, 6=Portuguese, 7=Dutch, 8=Russian, 9=Japanese, 10=Korean, 11=Chinese.'
    apiKey: string
    sourceLanguage: number
    targetLanguage: number

    constructor(apiKey: string, sourceLanguage: number, targetLanguage: number) {
        super()
        this.apiKey = apiKey
        this.sourceLanguage = sourceLanguage
        this.targetLanguage = targetLanguage
    }

    async _call(input: string): Promise<string> {
        const body = {
            text: input,
            source_language: this.sourceLanguage,
            target_language: this.targetLanguage
        }

        const res = await cambFetch('/translation/stream', { apiKey: this.apiKey }, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
        if (!res.ok) {
            throw new Error(`CAMB AI Translation error (${res.status}): ${await res.text()}`)
        }
        return await res.text()
    }
}

class CambTranslate_Tools implements INode {
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
        this.label = 'CAMB AI Translate'
        this.name = 'cambTranslate'
        this.version = 1.0
        this.type = 'CambTranslate'
        this.icon = 'camb-ai.svg'
        this.category = 'Tools'
        this.description = 'Translate text between 140+ languages using CAMB AI'
        this.baseClasses = [this.type, ...getBaseClasses(CambTranslateTool)]
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
                description: 'Source language code (integer). 1=English, 2=Spanish, 3=French, etc.'
            },
            {
                label: 'Target Language',
                name: 'targetLanguage',
                type: 'number',
                default: 2,
                description: 'Target language code (integer). 1=English, 2=Spanish, 3=French, etc.'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('cambApiKey', credentialData, nodeData)
        const sourceLanguage = parseInt((nodeData.inputs?.sourceLanguage as string) || '1', 10)
        const targetLanguage = parseInt((nodeData.inputs?.targetLanguage as string) || '2', 10)

        return new CambTranslateTool(apiKey, sourceLanguage, targetLanguage)
    }
}

module.exports = { nodeClass: CambTranslate_Tools }
