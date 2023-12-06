import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { UnstructuredLoader, UnstructuredLoaderOptions } from 'langchain/document_loaders/fs/unstructured'
import { getCredentialData, getCredentialParam } from '../../../src/utils'

class UnstructuredFile_DocumentLoaders implements INode {
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
        this.label = 'Unstructured File Loader'
        this.name = 'unstructuredFileLoader'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'unstructured.png'
        this.category = 'Document Loaders'
        this.description = 'Use Unstructured.io to load data from a file path'
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
                label: 'File Path',
                name: 'filePath',
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
                label: 'Element Type',
                name: 'elementType',
                description:
                    'Unstructured partition document into different types, select the types to return. If not selected, all types will be returned',
                type: 'multiOptions',
                options: [
                    {
                        label: 'FigureCaption',
                        name: 'FigureCaption'
                    },
                    {
                        label: 'NarrativeText',
                        name: 'NarrativeText'
                    },
                    {
                        label: 'ListItem',
                        name: 'ListItem'
                    },
                    {
                        label: 'Title',
                        name: 'Title'
                    },
                    {
                        label: 'Address',
                        name: 'Address'
                    },
                    {
                        label: 'Table',
                        name: 'Table'
                    },
                    {
                        label: 'PageBreak',
                        name: 'PageBreak'
                    },
                    {
                        label: 'Header',
                        name: 'Header'
                    },
                    {
                        label: 'Footer',
                        name: 'Footer'
                    },
                    {
                        label: 'UncategorizedText',
                        name: 'UncategorizedText'
                    },
                    {
                        label: 'Image',
                        name: 'Image'
                    },
                    {
                        label: 'Formula',
                        name: 'Formula'
                    }
                ],
                default: [],
                optional: true,
                additionalParams: true
            },
            {
                label: 'Metadata',
                name: 'metadata',
                type: 'json',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const filePath = nodeData.inputs?.filePath as string
        const unstructuredAPIUrl = nodeData.inputs?.unstructuredAPIUrl as string
        const elementType = nodeData.inputs?.elementType as string
        const metadata = nodeData.inputs?.metadata

        const obj: UnstructuredLoaderOptions = { apiUrl: unstructuredAPIUrl }

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const unstructuredAPIKey = getCredentialParam('unstructuredAPIKey', credentialData, nodeData)
        if (unstructuredAPIKey) obj.apiKey = unstructuredAPIKey

        const loader = new UnstructuredLoader(filePath, obj)
        const docs = await loader.load()

        let elementTypes: string[] = []
        if (elementType) {
            try {
                elementTypes = JSON.parse(elementType)
            } catch (e) {
                elementTypes = []
            }
        }

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
            return elementTypes.length ? finaldocs.filter((doc) => elementTypes.includes(doc.metadata.category)) : finaldocs
        }

        return elementTypes.length ? docs.filter((doc) => elementTypes.includes(doc.metadata.category)) : docs
    }
}

module.exports = { nodeClass: UnstructuredFile_DocumentLoaders }
