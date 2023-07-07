import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { MilvusClient, DataTypeMap, DataType } from '@zilliz/milvus2-sdk-node'
import { MilvusLibArgs, Milvus } from 'langchain/vectorstores/milvus'
import { Embeddings } from 'langchain/embeddings/base'
import { getBaseClasses } from '../../../src/utils'

class Milvus_Existing_VectorStores implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Milvus Load Existing collection'
        this.name = 'milvusExistingCollection'
        this.type = 'milvus'
        this.icon = 'milvus.svg'
        this.category = 'Vector Stores'
        this.description = 'Load existing collection from Milvus (i.e: Document has been upserted)'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.inputs = [
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'Milvus Server URL',
                name: 'milvusServerUrl',
                type: 'string',
                placeholder: 'http://localhost:19530'
            },
            {
                label: 'Milvus Collection Name',
                name: 'milvusCollection',
                type: 'string'
            },
            {
                label: 'Milvus Username',
                name: 'milvusUser',
                type: 'string',
                optional: true
            },
            {
                label: 'Milvus Password',
                name: 'milvusPassword',
                type: 'string',
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Milvus Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Milvus Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(Milvus)]
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        // server setup
        const address = nodeData.inputs?.milvusServerUrl as string
        const collectionName = nodeData.inputs?.milvusCollection as string
        // optional
        const username = nodeData.inputs?.milvusUser as string
        const password = nodeData.inputs?.milvusPassword as string
        // embeddings
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const topK = nodeData.inputs?.topK as string
        // output
        const output = nodeData.outputs?.output as string


        // format data
        const k = topK ? parseInt(topK, 10) : 4

        const client = new MilvusClient({
            address
        })

        const collectionInfo = await client.describeCollection({ collection_name: collectionName })

        // init MilvusLibArgs
        let obj: MilvusLibArgs = {
            url: address,
            collectionName: collectionName,
            primaryField: '',
            vectorField: '',
            textField: '', 
            username: '',
            password: ''
        }

        // extract key information
        for (let i = 0; i < collectionInfo.schema.fields.length; i++) {
            const f = collectionInfo.schema.fields[i]
            const type = DataTypeMap[f.data_type]

            // get pk field info
            if (f.is_primary_key) {
                obj.primaryField = f.name
            }

            // get vector field info
            if (type === DataType.FloatVector || type === DataType.BinaryVector) {
                // vector name
                obj.vectorField = f.name
            }

            // get textFiled
            if (type === DataType.VarChar && !f.is_primary_key) {
                obj.textField = f.name
            }
        }

        // overwride
        if (username) {
            obj.username = username
        }

        if (password) {
            obj.password = password
        }

        const vectorStore = await Milvus.fromExistingCollection(embeddings, obj)

        if (output === 'retriever') {
            const retriever = vectorStore.asRetriever(k)
            return retriever
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            return vectorStore
        }
        return vectorStore
    }
}

module.exports = { nodeClass: Milvus_Existing_VectorStores }
