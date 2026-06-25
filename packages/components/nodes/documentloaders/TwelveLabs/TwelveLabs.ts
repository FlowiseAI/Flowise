import axios from 'axios'
import { omit } from 'lodash'
import { Document } from '@langchain/core/documents'
import { TextSplitter } from '@langchain/textsplitters'
import { ICommonObject, IDocument, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { getCredentialData, getCredentialParam, handleEscapeCharacters } from '../../../src/utils'

const TWELVELABS_API_BASE = 'https://api.twelvelabs.io/v1.3'

interface AnalyzeTask {
    task_id?: string
    status?: string
    result?: { data?: string }
}

class TwelveLabs_DocumentLoaders implements INode {
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
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'TwelveLabs Video'
        this.name = 'twelveLabsVideo'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'twelvelabs.svg'
        this.category = 'Document Loaders'
        this.description = 'Analyze a video with the TwelveLabs Pegasus model and load the generated text as a document'
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['twelveLabsApi']
        }
        this.inputs = [
            {
                label: 'Video URL',
                name: 'videoUrl',
                type: 'string',
                description: 'Publicly accessible URL of the video to analyze'
            },
            {
                label: 'Prompt',
                name: 'prompt',
                type: 'string',
                rows: 4,
                default: 'Provide a detailed description of this video.',
                description: 'Prompt that guides what Pegasus generates from the video'
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'string',
                default: 'pegasus1.5',
                description:
                    'Refer to <a target="_blank" href="https://docs.twelvelabs.io/v1.3/docs/concepts/models/pegasus">TwelveLabs documentation</a> for available models',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Max Tokens',
                name: 'maxTokens',
                type: 'number',
                default: 2048,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Polling Timeout (s)',
                name: 'timeout',
                type: 'number',
                default: 600,
                description: 'Maximum time to wait for the analysis to complete',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Additional Metadata',
                name: 'metadata',
                type: 'json',
                description: 'Additional metadata to be added to the extracted documents',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Omit Metadata Keys',
                name: 'omitMetadataKeys',
                type: 'string',
                rows: 4,
                description:
                    'Each document loader comes with a default set of metadata keys that are extracted from the document. You can use this field to omit some of the default metadata keys. The value should be a list of keys, seperated by comma. Use * to omit all metadata keys execept the ones you specify in the Additional Metadata field',
                placeholder: 'key1, key2, key3.nestedKey1',
                optional: true,
                additionalParams: true
            }
        ]
        this.outputs = [
            {
                label: 'Document',
                name: 'document',
                description: 'Array of document objects containing metadata and pageContent',
                baseClasses: [...this.baseClasses, 'json']
            },
            {
                label: 'Text',
                name: 'text',
                description: 'Concatenated string from pageContent of documents',
                baseClasses: ['string', 'json']
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const videoUrl = nodeData.inputs?.videoUrl as string
        const prompt = nodeData.inputs?.prompt as string
        const modelName = (nodeData.inputs?.modelName as string) || 'pegasus1.5'
        const maxTokens = nodeData.inputs?.maxTokens ? parseInt(nodeData.inputs?.maxTokens as string, 10) : undefined
        const timeoutSec = nodeData.inputs?.timeout ? parseInt(nodeData.inputs?.timeout as string, 10) : 600
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const metadata = nodeData.inputs?.metadata
        const output = nodeData.outputs?.output as string
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string

        if (!videoUrl) throw new Error('Video URL is required')

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('twelveLabsApiKey', credentialData, nodeData)
        if (!apiKey) throw new Error('TwelveLabs API key is required')

        const analysis = await this.analyzeVideo(apiKey, { videoUrl, prompt, modelName, maxTokens, timeoutSec })

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        let docs: IDocument[] = []
        const baseMetadata = { source: videoUrl, model: modelName }

        if (textSplitter) {
            const splitDocs = await textSplitter.createDocuments([analysis])
            docs.push(...splitDocs.map((doc) => ({ ...doc, metadata: { ...doc.metadata, ...baseMetadata } })))
        } else {
            docs.push(new Document({ pageContent: analysis, metadata: baseMetadata }))
        }

        const parsedMetadata = metadata ? (typeof metadata === 'object' ? metadata : JSON.parse(metadata)) : {}
        docs = docs.map((doc) => ({
            ...doc,
            metadata: _omitMetadataKeys === '*' ? { ...parsedMetadata } : omit({ ...doc.metadata, ...parsedMetadata }, omitMetadataKeys)
        }))

        if (output === 'document') {
            return docs
        } else {
            let finaltext = ''
            for (const doc of docs) {
                finaltext += `${doc.pageContent}\n`
            }
            return handleEscapeCharacters(finaltext, false)
        }
    }

    private async analyzeVideo(
        apiKey: string,
        params: { videoUrl: string; prompt: string; modelName: string; maxTokens?: number; timeoutSec: number }
    ): Promise<string> {
        const headers = { 'x-api-key': apiKey }
        const body: ICommonObject = {
            model_name: params.modelName,
            video: { type: 'url', url: params.videoUrl },
            prompt: params.prompt
        }
        if (params.maxTokens) body.max_tokens = params.maxTokens

        const { data: task } = await axios.post<AnalyzeTask>(`${TWELVELABS_API_BASE}/analyze/tasks`, body, { headers })
        const taskId = task?.task_id
        if (!taskId) throw new Error('TwelveLabs did not return an analysis task id')

        const deadline = Date.now() + params.timeoutSec * 1000
        while (Date.now() < deadline) {
            const { data: status } = await axios.get<AnalyzeTask>(`${TWELVELABS_API_BASE}/analyze/tasks/${taskId}`, { headers })
            if (status.status === 'ready') {
                return status.result?.data ?? ''
            }
            if (status.status === 'failed') {
                throw new Error('TwelveLabs analysis task failed')
            }
            await new Promise((resolve) => setTimeout(resolve, 5000))
        }
        throw new Error(`TwelveLabs analysis did not complete within ${params.timeoutSec}s`)
    }
}

module.exports = { nodeClass: TwelveLabs_DocumentLoaders }
