import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeOptionsValue, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { DataSource } from 'typeorm'

class DocStore_VectorStores implements INode {
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

    constructor() {
        this.label = 'Document Store (Vector)'
        this.name = 'documentStoreVS'
        this.version = 1.0
        this.type = 'DocumentStoreVS'
        this.icon = 'dstore.svg'
        this.category = 'Vector Stores'
        this.description = `Search and retrieve documents from Document Store`
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
                label: 'Retriever',
                name: 'retriever',
                baseClasses: ['BaseRetriever']
            },
            {
                label: 'Vector Store',
                name: 'vectorStore',
                baseClasses: ['VectorStore']
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listStores(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const returnData: INodeOptionsValue[] = []

            const appDataSource = options.appDataSource as DataSource
            const databaseEntities = options.databaseEntities as IDatabaseEntity

            if (appDataSource === undefined || !appDataSource) {
                return returnData
            }

            const searchOptions = options.searchOptions || {}
            const stores = await appDataSource.getRepository(databaseEntities['DocumentStore']).findBy(searchOptions)
            for (const store of stores) {
                if (store.status === 'UPSERTED') {
                    const obj = {
                        name: store.id,
                        label: store.name,
                        description: store.description
                    }
                    returnData.push(obj)
                }
            }
            return returnData
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const selectedStore = nodeData.inputs?.selectedStore as string
        const appDataSource = options.appDataSource as DataSource
        const databaseEntities = options.databaseEntities as IDatabaseEntity
        const output = nodeData.outputs?.output as string

        const entity = await appDataSource.getRepository(databaseEntities['DocumentStore']).findOneBy({ id: selectedStore })
        if (!entity) {
            return { error: 'Store not found' }
        }
        const data: ICommonObject = {}
        data.output = output

        // Prepare Embeddings Instance
        const embeddingConfig = JSON.parse(entity.embeddingConfig)
        data.embeddingName = embeddingConfig.name
        data.embeddingConfig = embeddingConfig.config
        let embeddingObj = await _createEmbeddingsObject(options.componentNodes, data, options)
        if (!embeddingObj) {
            return { error: 'Failed to create EmbeddingObj' }
        }

        // Prepare Vector Store Instance
        const vsConfig = JSON.parse(entity.vectorStoreConfig)
        data.vectorStoreName = vsConfig.name
        data.vectorStoreConfig = vsConfig.config
        if (data.inputs) {
            data.vectorStoreConfig = { ...vsConfig.config, ...data.inputs }
        }

        // Prepare Vector Store Node Data
        const vStoreNodeData = _createVectorStoreNodeData(options.componentNodes, data, embeddingObj)

        // Finally create the Vector Store or Retriever object (data.output)
        const vectorStoreObj = await _createVectorStoreObject(options.componentNodes, data)
        const retrieverOrVectorStore = await vectorStoreObj.init(vStoreNodeData, '', options)
        if (!retrieverOrVectorStore) {
            return { error: 'Failed to create vectorStore' }
        }
        return retrieverOrVectorStore
    }
}

const _createEmbeddingsObject = async (componentNodes: ICommonObject, data: ICommonObject, options: ICommonObject): Promise<any> => {
    // prepare embedding node data
    const embeddingComponent = componentNodes[data.embeddingName]
    const embeddingNodeData: any = {
        inputs: { ...data.embeddingConfig },
        outputs: { output: 'document' },
        id: `${embeddingComponent.name}_0`,
        label: embeddingComponent.label,
        name: embeddingComponent.name,
        category: embeddingComponent.category,
        inputParams: embeddingComponent.inputs || []
    }
    if (data.embeddingConfig.credential) {
        embeddingNodeData.credential = data.embeddingConfig.credential
    }

    // init embedding object
    const embeddingNodeInstanceFilePath = embeddingComponent.filePath as string
    const embeddingNodeModule = await import(embeddingNodeInstanceFilePath)
    const embeddingNodeInstance = new embeddingNodeModule.nodeClass()
    return await embeddingNodeInstance.init(embeddingNodeData, '', options)
}

const _createVectorStoreNodeData = (componentNodes: ICommonObject, data: ICommonObject, embeddingObj: any) => {
    const vectorStoreComponent = componentNodes[data.vectorStoreName]
    const vStoreNodeData: any = {
        id: `${vectorStoreComponent.name}_0`,
        inputs: { ...data.vectorStoreConfig },
        outputs: { output: data.output },
        label: vectorStoreComponent.label,
        name: vectorStoreComponent.name,
        category: vectorStoreComponent.category
    }
    if (data.vectorStoreConfig.credential) {
        vStoreNodeData.credential = data.vectorStoreConfig.credential
    }

    if (embeddingObj) {
        vStoreNodeData.inputs.embeddings = embeddingObj
    }

    // Get all input params except the ones that are anchor points to avoid JSON stringify circular error
    const filterInputParams = ['document', 'embeddings', 'recordManager']
    const inputParams = vectorStoreComponent.inputs?.filter((input: any) => !filterInputParams.includes(input.name))
    vStoreNodeData.inputParams = inputParams
    return vStoreNodeData
}

const _createVectorStoreObject = async (componentNodes: ICommonObject, data: ICommonObject) => {
    const vStoreNodeInstanceFilePath = componentNodes[data.vectorStoreName].filePath as string
    const vStoreNodeModule = await import(vStoreNodeInstanceFilePath)
    const vStoreNodeInstance = new vStoreNodeModule.nodeClass()
    return vStoreNodeInstance
}

module.exports = { nodeClass: DocStore_VectorStores }
