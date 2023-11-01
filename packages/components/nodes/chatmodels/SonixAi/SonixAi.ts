import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { ChatOpenAI, OpenAIChatInput } from 'langchain/chat_models/openai'
import { SonixAudioTranscriptionLoader } from "langchain/document_loaders/web/sonix_audio";
import {SupportedLanguage}  from 'sonix-speech-recognition/lib/types'
import { BaseCache } from 'langchain/schema'
import { BaseLLMParams } from 'langchain/llms/base'

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
                label: 'Cache',
                name: 'cache',
                type: 'BaseCache',
                optional: true
            },
            {
                label: 'Audio File',
                name: 'audio_File',
                type: 'file',
                fileType: '.*'
            },{
                label: 'Audio File Name',
                name: 'audio_File_name',
                type: 'string'
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
        const temperature = nodeData.inputs?.temperature as string

        type SonixAiInput = {
            sonixAuthKey?: string,
            cache?:BaseCache,
            request: {
              audioFilePath?: string,
              fileName?:string,
              language?: SupportedLanguage,
              
        }}
        const audiofilepath = nodeData.inputs?.audio_File as string
        const audiofilename = nodeData.inputs?.audio_File_name as string
        const language = nodeData.inputs?.language as SupportedLanguage

        const modelName = nodeData.inputs?.modelName as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const frequencyPenalty = nodeData.inputs?.frequencyPenalty as string
        const presencePenalty = nodeData.inputs?.presencePenalty as string
        const timeout = nodeData.inputs?.timeout as string
        const streaming = nodeData.inputs?.streaming as boolean
        const basePath = nodeData.inputs?.basepath as string
        const baseOptions = nodeData.inputs?.baseOptions

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const sonixAuthKey = getCredentialParam('sonixAIApiKey', credentialData, nodeData)
        if(!sonixAuthKey) return 
        const cache = nodeData.inputs?.cache as BaseCache

        // const obj: Partial<SonixAiInput> = {
        //     sonixAuthKey:sonixAuthKey || '',
        //     request:{
        //         audioFilePath:audiofilepath,
        //         fileName:audiofilename,
        //         language:language
        //     }
        // }

        // if (cache) obj.cache = cache

        const loader = new SonixAudioTranscriptionLoader({
            sonixAuthKey: sonixAuthKey,
            request: {
              audioFilePath: audiofilepath,
              fileName: audiofilename,
              language: language,
        }});
          
          const docs = await loader.load();
          
         return docs

        // const model = new ChatOpenAI(obj, {
        //     basePath,
        //     baseOptions: parsedBaseOptions
        // })
        // return model
    }
}

module.exports = { nodeClass: SonixAi }
