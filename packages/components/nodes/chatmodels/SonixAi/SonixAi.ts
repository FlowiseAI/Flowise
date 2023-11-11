import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { SonixAudioTranscriptionLoader } from "langchain/document_loaders/web/sonix_audio";
import {SupportedLanguage}  from 'sonix-speech-recognition/lib/types'

class SonixAi implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    
    constructor() {
        this.label = 'SonixAi'
        this.name = 'SonixAi'
        this.version = 1.0
        this.type = 'SonixAi'
        this.icon = 'sonixAi.svg'
        this.category = 'Chat Models'
        this.description = 'Converts audio to transcription'
        this.baseClasses = [this.type, ...getBaseClasses(SonixAudioTranscriptionLoader)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['sonixAIApi']
        }
        this.inputs = [
            {
                label: 'Audio File',
                name: 'audio_File',
                type: 'file',
                fileType: '.*'
            },
            {
                label: 'Language',
                name: 'language',
                type: 'options',
                options: [
                    {
                        label: 'English',
                        name: 'en'
                    }
                ],
                default: 'en',
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const audiofilepath = nodeData.inputs?.audio_File as string
        const audiofilename = nodeData.inputs?.audio_File?.filename as string
        const language = nodeData.inputs?.language as SupportedLanguage

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const sonixAuthKey = getCredentialParam('sonixAIApiKey', credentialData, nodeData)
        if(!sonixAuthKey) return 

        const loader = new SonixAudioTranscriptionLoader({
            sonixAuthKey: sonixAuthKey,
            request: {
              audioFilePath: audiofilepath,
              fileName: audiofilename,
              language: language,
        }});
          
          const docs = await loader.load();
          
         return docs
    }
}

module.exports = { nodeClass: SonixAi }
