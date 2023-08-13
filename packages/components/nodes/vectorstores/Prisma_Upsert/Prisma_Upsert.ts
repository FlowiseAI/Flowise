import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { Embeddings } from 'langchain/embeddings/base'
import { Document } from 'langchain/document'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { PrismaVectorStore } from "langchain/vectorstores/prisma";
import { PrismaClient, Prisma} from "@prisma/client";
import { flatten } from 'lodash'

class PrismaUpsert_VectorStores implements INode {
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
        this.label = 'Prisma Upsert Document'
        this.name = 'prismaUpsert'
        this.version = 1.0
        this.type = 'Prisma'
        this.icon = 'prisma.svg'
        this.category = 'Vector Stores'
        this.description = 'Upsert documents to a Postgres Database using Prisma'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['postgresDatabase']
        }
        this.inputs = [
            {
                label: 'Document',
                name: 'document',
                type: 'Document',
                list: true
            },
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'Database Name',
                name: 'dbName',
                type: 'string'
            },
            {
                label: 'Table Name',
                name: 'tableName',
                type: 'string'
            },
            {
                label: 'Vector Column Name',
                name: 'vectorColumnName',
                type: 'string'
            },
            {
                label: 'Top K',
                name: 'topK',
                description: 'Number of top results to fetch. Default to 4',
                placeholder: '4',
                type: 'number',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Prisma Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Prisma Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(PrismaVectorStore)]
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const databaseName = nodeData.inputs?.dbName as string
        const tableName = nodeData.inputs?.tableName as string
        const vectorColumnName = nodeData.inputs?.vectorColumnName as string
        const docs = nodeData.inputs?.document as Document[]
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const output = nodeData.outputs?.output as string
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)

        const client = new PrismaClient({
            datasources: {
                db: {
                    url: `postgresql://${credentialData.user}:${credentialData.password}@${credentialData.host}:${credentialData.port}/${databaseName}`
                }
            }
        });

        const flattenDocs = docs && docs.length ? flatten(docs) : []
        const finalDocs = []
        for (let i = 0; i < flattenDocs.length; i += 1) {
            finalDocs.push(new Document(flattenDocs[i]))
        }

        const vectorStore = await PrismaVectorStore.fromDocuments(finalDocs, embeddings, {
            db: client,
            prisma: Prisma,
            tableName: tableName,
            vectorColumnName: vectorColumnName,
            columns: {
                id: PrismaVectorStore.IdColumn,
                content: PrismaVectorStore.ContentColumn,
            }
        })
        

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

module.exports = { nodeClass: PrismaUpsert_VectorStores }
