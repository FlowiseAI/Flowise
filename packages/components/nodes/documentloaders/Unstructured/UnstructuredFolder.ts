import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { UnstructuredDirectoryLoader, UnstructuredLoaderOptions } from 'langchain/document_loaders/fs/unstructured'
import { getCredentialData, getCredentialParam } from '../../../src/utils'

class UnstructuredFolder_DocumentLoaders implements INode {
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
        this.label = 'Unstructured Folder Loader'
        this.name = 'unstructuredFolderLoader'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'unstructured.png'
        this.category = 'Document Loaders'
        this.description = 'Use Unstructured.io to load data from a folder'
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['unstructuredApi'],
            optional: true
        }
        this.inputs = [
            {
                label: 'Folder Path',
                name: 'folderPath',
                type: 'string',
                placeholder: ''
            },
            {
                label: 'Unstructured API URL',
                name: 'unstructuredAPIUrl',
                description:
                    'Unstructured API URL. Read <a target="_blank" href="https://unstructured-io.github.io/unstructured/introduction.html#getting-started">more</a> on how to get started',
                type: 'string',
                default: 'http://localhost:8000/general/v0/general'
            },
            {
                label: 'Metadata',
                name: 'metadata',
                type: 'json',
                optional: true,
                additionalParams: true
            }
            /*TODO Add Filter Options*/
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const folderPath = nodeData.inputs?.folderPath as string
        const unstructuredAPIUrl = nodeData.inputs?.unstructuredAPIUrl as string
        const metadata = nodeData.inputs?.metadata

        const obj: UnstructuredLoaderOptions = { apiUrl: unstructuredAPIUrl }

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const unstructuredAPIKey = getCredentialParam('unstructuredAPIKey', credentialData, nodeData)
        if (unstructuredAPIKey) obj.apiKey = unstructuredAPIKey

        const loader = new UnstructuredDirectoryLoader(folderPath, obj)
        const docs = await loader.load()

        if (metadata) {
            const parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
            let finaldocs = []
            for (const doc of docs) {
                const newdoc = {
                    ...doc,
                    metadata: {
                        ...doc.metadata,
                        ...parsedMetadata
                    }
                }
                finaldocs.push(newdoc)
            }
            return finaldocs
        }

        return docs
    }
}

module.exports = { nodeClass: UnstructuredFolder_DocumentLoaders }
