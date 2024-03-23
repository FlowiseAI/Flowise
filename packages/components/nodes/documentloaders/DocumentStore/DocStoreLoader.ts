import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeOutputsValue, INodeParams } from '../../../src/Interface'

class DocStore_DocumentLoaders implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]
    badge: string

    constructor() {
        this.label = 'Document Store'
        this.name = 'documentStore'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'Txt.svg'
        this.badge = 'NEW'

        this.category = 'Document Loaders'
        this.description = `Load data from pre-configured document stores`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Select Store',
                name: 'selectedStore',
                type: 'asyncOptions',
                loadMethod: 'listStores'
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

    //@ts-ignore
    loadMethods = {
        async listStores(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const returnData: INodeOptionsValue[] = []

            // const appDataSource = options.appDataSource as DataSource
            // const databaseEntities = options.databaseEntities as IDaßtabaseEntity
            //
            // if (appDataSource === undefined || !appDataSource) {
            //     return returnData
            // }
            //
            // const tools = await appDataSource.getRepository(databaseEntities['Tool']).find()
            //
            let obj = {
                name: '0',
                label: 'Q&A',
                description: 'Collection of documents for Q&A'
            }
            returnData.push(obj)
            obj = {
                name: '1',
                label: 'my code',
                description: 'Flowise Code'
            }
            returnData.push(obj)
            return returnData
        }
    }

    async init(nodeData: INodeData): Promise<any> {
        return {}
    }
}

module.exports = { nodeClass: DocStore_DocumentLoaders }
