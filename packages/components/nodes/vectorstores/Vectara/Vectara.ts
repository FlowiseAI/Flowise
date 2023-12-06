import { flatten } from 'lodash'
import { VectaraStore, VectaraLibArgs, VectaraFilter, VectaraContextConfig, VectaraFile } from 'langchain/vectorstores/vectara'
import { Document } from 'langchain/document'
import { Embeddings } from 'langchain/embeddings/base'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class Vectara_VectorStores implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    badge: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Vectara'
        this.name = 'vectara'
        this.version = 1.0
        this.type = 'Vectara'
        this.icon = 'vectara.png'
        this.category = 'Vector Stores'
        this.description = 'Upsert embedded data and perform similarity search upon query using Vectara, a LLM-powered search-as-a-service'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.badge = 'NEW'
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['vectaraApi']
        }
        this.inputs = [
            {
                label: 'Document',
                name: 'document',
                type: 'Document',
                list: true,
                optional: true
            },
            {
                label: 'File',
                name: 'file',
                description:
                    'File to upload to Vectara. Supported file types: https://docs.vectara.com/docs/api-reference/indexing-apis/file-upload/file-upload-filetypes',
                type: 'file',
                optional: true
            },
            {
                label: 'Metadata Filter',
                name: 'filter',
                description:
                    'Filter to apply to Vectara metadata. Refer to the <a target="_blank" href="https://docs.flowiseai.com/vector-stores/vectara">documentation</a> on how to use Vectara filters with Flowise.',
                type: 'string',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Sentences Before',
                name: 'sentencesBefore',
                description: 'Number of sentences to fetch before the matched sentence. Defaults to 2.',
                type: 'number',
                default: 2,
                additionalParams: true,
                optional: true
            },
            {
                label: 'Sentences After',
                name: 'sentencesAfter',
                description: 'Number of sentences to fetch after the matched sentence. Defaults to 2.',
                type: 'number',
                default: 2,
                additionalParams: true,
                optional: true
            },
            {
                label: 'Lambda',
                name: 'lambda',
                description:
                    'Improves retrieval accuracy by adjusting the balance (from 0 to 1) between neural search and keyword-based search factors.',
                type: 'number',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Top K',
                name: 'topK',
                description: 'Number of top results to fetch. Defaults to 4',
                placeholder: '4',
                type: 'number',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Vectara Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Vectara Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(VectaraStore)]
            }
        ]
    }

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<void> {
            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const apiKey = getCredentialParam('apiKey', credentialData, nodeData)
            const customerId = getCredentialParam('customerID', credentialData, nodeData)
            const corpusId = getCredentialParam('corpusID', credentialData, nodeData).split(',')

            const docs = nodeData.inputs?.document as Document[]
            const embeddings = {} as Embeddings
            const vectaraMetadataFilter = nodeData.inputs?.filter as string
            const sentencesBefore = nodeData.inputs?.sentencesBefore as number
            const sentencesAfter = nodeData.inputs?.sentencesAfter as number
            const lambda = nodeData.inputs?.lambda as number
            const fileBase64 = nodeData.inputs?.file

            const vectaraArgs: VectaraLibArgs = {
                apiKey: apiKey,
                customerId: customerId,
                corpusId: corpusId,
                source: 'flowise'
            }

            const vectaraFilter: VectaraFilter = {}
            if (vectaraMetadataFilter) vectaraFilter.filter = vectaraMetadataFilter
            if (lambda) vectaraFilter.lambda = lambda

            const vectaraContextConfig: VectaraContextConfig = {}
            if (sentencesBefore) vectaraContextConfig.sentencesBefore = sentencesBefore
            if (sentencesAfter) vectaraContextConfig.sentencesAfter = sentencesAfter
            vectaraFilter.contextConfig = vectaraContextConfig

            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    finalDocs.push(new Document(flattenDocs[i]))
                }
            }

            let files: string[] = []
            if (fileBase64.startsWith('[') && fileBase64.endsWith(']')) {
                files = JSON.parse(fileBase64)
            } else {
                files = [fileBase64]
            }

            const vectaraFiles: VectaraFile[] = []
            for (const file of files) {
                const splitDataURI = file.split(',')
                splitDataURI.pop()
                const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
                const blob = new Blob([bf])
                vectaraFiles.push({ blob: blob, fileName: getFileName(file) })
            }

            try {
                if (finalDocs.length) await VectaraStore.fromDocuments(finalDocs, embeddings, vectaraArgs)
                if (vectaraFiles.length) {
                    const vectorStore = new VectaraStore(vectaraArgs)
                    await vectorStore.addFiles(vectaraFiles)
                }
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('apiKey', credentialData, nodeData)
        const customerId = getCredentialParam('customerID', credentialData, nodeData)
        const corpusId = getCredentialParam('corpusID', credentialData, nodeData).split(',')

        const vectaraMetadataFilter = nodeData.inputs?.filter as string
        const sentencesBefore = nodeData.inputs?.sentencesBefore as number
        const sentencesAfter = nodeData.inputs?.sentencesAfter as number
        const lambda = nodeData.inputs?.lambda as number
        const output = nodeData.outputs?.output as string
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4

        const vectaraArgs: VectaraLibArgs = {
            apiKey: apiKey,
            customerId: customerId,
            corpusId: corpusId,
            source: 'flowise'
        }

        const vectaraFilter: VectaraFilter = {}
        if (vectaraMetadataFilter) vectaraFilter.filter = vectaraMetadataFilter
        if (lambda) vectaraFilter.lambda = lambda

        const vectaraContextConfig: VectaraContextConfig = {}
        if (sentencesBefore) vectaraContextConfig.sentencesBefore = sentencesBefore
        if (sentencesAfter) vectaraContextConfig.sentencesAfter = sentencesAfter
        vectaraFilter.contextConfig = vectaraContextConfig

        const vectorStore = new VectaraStore(vectaraArgs)

        if (output === 'retriever') {
            const retriever = vectorStore.asRetriever(k, vectaraFilter)
            return retriever
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            return vectorStore
        }
        return vectorStore
    }
}

const getFileName = (fileBase64: string) => {
    let fileNames = []
    if (fileBase64.startsWith('[') && fileBase64.endsWith(']')) {
        const files = JSON.parse(fileBase64)
        for (const file of files) {
            const splitDataURI = file.split(',')
            const filename = splitDataURI[splitDataURI.length - 1].split(':')[1]
            fileNames.push(filename)
        }
        return fileNames.join(', ')
    } else {
        const splitDataURI = fileBase64.split(',')
        const filename = splitDataURI[splitDataURI.length - 1].split(':')[1]
        return filename
    }
}

module.exports = { nodeClass: Vectara_VectorStores }
