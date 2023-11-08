import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { Pinecone } from '@pinecone-database/pinecone'
import { PineconeLibArgs, PineconeStore } from 'langchain/vectorstores/pinecone'
import { Embeddings } from 'langchain/embeddings/base'
import { handleEscapeCharacters, getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class Pinecone_Existing_VectorStores implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Pinecone Load Existing Index - CSSF'
        this.name = 'pineconeExistingIndexCSSF'
        this.version = 1.0
        this.type = 'Pinecone'
        this.icon = 'pinecone.png'
        this.category = 'Vector Stores'
        this.description = 'Load existing index from Pinecone (i.e: Document has been upserted)'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['pineconeApi']
        }
        this.inputs = [
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'Pinecone Index',
                name: 'pineconeIndex',
                type: 'string'
            },
            {
                label: 'Pinecone Namespace',
                name: 'pineconeNamespace',
                type: 'string',
                placeholder: 'my-first-namespace',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Pinecone Metadata Filter',
                name: 'pineconeMetadataFilter',
                type: 'json',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top K',
                name: 'topK',
                description: 'Number of top results to fetch. Default to 4',
                placeholder: '4',
                type: 'number',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Minimum Score (%)',
                name: 'minScore',
                type: 'number',
                optional: true,
                placeholder: '75',
                step: 1,
                description: 'Minumum score for embeddings documents to be included'
            },
            {
                label: 'Pinecone Metadata Filter',
                name: 'values',
                type: 'json',
                optional: true,
                acceptVariable: true,
                list: true
            }
        ]
        this.outputs = [
            {
                label: 'Pinecone Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Pinecone Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(PineconeStore)]
            },
            {
                label: 'Document',
                name: 'document',
                baseClasses: this.baseClasses
            },
            {
                label: 'Text',
                name: 'text',
                baseClasses: ['string', 'json']
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const minScore = nodeData.inputs?.minScore as number
        const values = nodeData.inputs?.values as object
        const index = nodeData.inputs?.pineconeIndex as string
        const pineconeNamespace = nodeData.inputs?.pineconeNamespace as string
        const pineconeMetadataFilter = nodeData.inputs?.pineconeMetadataFilter
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const output = nodeData.outputs?.output as string
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const pineconeApiKey = getCredentialParam('pineconeApiKey', credentialData, nodeData)
        const pineconeEnv = getCredentialParam('pineconeEnv', credentialData, nodeData)

        const client = new Pinecone({
            apiKey: pineconeApiKey,
            environment: pineconeEnv
        })

        const pineconeIndex = client.Index(index)

        const obj: PineconeLibArgs = {
            pineconeIndex
        }

        let promptValues: ICommonObject = {}
        if (values) {
            try {             
                promptValues = typeof values === 'object' ? values : JSON.parse(values)
                for (const property in promptValues) {
                    promptValues[property] = promptValues[property].replaceAll("FLOWISE_NEWLINE", "")
                    promptValues[property] = promptValues[property].replaceAll("FLOWISE_DOUBLE_QUOTE", '"')
                    if(property === 'query'){
                        promptValues[property] = JSON.parse(promptValues[property])
                        console.log('fixed query')
                    }
                  }
                console.log(promptValues)
            } catch (exception) {
                throw new Error("Invalid JSON in the PromptTemplate's promptValues: " + exception)
            }
        }
    
        let filter = {}
        let actions_array = ["CSSFQuery", "SmallTalk", "OT" ]
        if(promptValues.query.action === "AnyCircularFilter" ){
            filter = {
                "$or": [
                    { "cssfType": { "$eq": "Circular" } }
                ]
            
            }
        }
        else if(promptValues.query.action === "CircularQuery" ){
            filter = {
                "$and": [
                    { "cssfType": { "$eq": "Circular" } },
                    { "circularId": { "$in": promptValues.query.options } }
                ]
            }
        
        }
        else if(actions_array.includes(promptValues.query.action)){
            return {}
        }

        if (pineconeNamespace) obj.namespace = pineconeNamespace
        if (pineconeMetadataFilter) {
            const metadatafilter = typeof pineconeMetadataFilter === 'object' ? pineconeMetadataFilter : JSON.parse(pineconeMetadataFilter)
            obj.filter = metadatafilter
        }
        obj.filter = filter
        obj.textKey = promptValues.question

        const vectorStore = await PineconeStore.fromExistingIndex(embeddings, obj)
        const docs = await vectorStore.similaritySearchWithScore(promptValues.query.question ,k) 

       // eslint-disable-next-line no-console
       console.log('\x1b[94m\x1b[1m\n*****VectorStore Documents*****\n\x1b[0m\x1b[0m')
       // eslint-disable-next-line no-console
       console.log(docs)
       console.log(JSON.stringify(docs))

        if (output === 'document') {
           let finaldocs = []
           for (const doc of docs) {
               if (minScore && doc[1] < minScore / 100) continue
               finaldocs.push(doc[0])
           }
           return finaldocs.toString()
        } else {
           let finaltext = ''
           for (const doc of docs) {
               if (minScore && doc[1] < minScore / 100) continue
               finaltext += `${doc[0].metadata.text}\n`
           }
           return handleEscapeCharacters(finaltext, false)
        }
    }
}

module.exports = { nodeClass: Pinecone_Existing_VectorStores }
