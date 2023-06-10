import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { GithubRepoLoader, GithubRepoLoaderParams } from 'langchain/document_loaders/web/github'

class Github_DocumentLoaders implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Github'
        this.name = 'github'
        this.type = 'Document'
        this.icon = 'github.png'
        this.category = 'Document Loaders'
        this.description = `Load data from a GitHub repository`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Repo Link',
                name: 'repoLink',
                type: 'string',
                placeholder: 'https://github.com/FlowiseAI/Flowise'
            },
            {
                label: 'Branch',
                name: 'branch',
                type: 'string',
                default: 'main'
            },
            {
                label: 'Access Token',
                name: 'accessToken',
                type: 'password',
                placeholder: '<GITHUB_ACCESS_TOKEN>',
                optional: true
            },
            {
                label: 'Recursive',
                name: 'recursive',
                type: 'boolean',
                optional: true
            },
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
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

    async init(nodeData: INodeData): Promise<any> {
        const repoLink = nodeData.inputs?.repoLink as string
        const branch = nodeData.inputs?.branch as string
        const recursive = nodeData.inputs?.recursive as boolean
        const accessToken = nodeData.inputs?.accessToken as string
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const metadata = nodeData.inputs?.metadata

        const options: GithubRepoLoaderParams = {
            branch,
            recursive,
            unknown: 'warn'
        }

        if (accessToken) options.accessToken = accessToken

        const loader = new GithubRepoLoader(repoLink, options)
        const docs = textSplitter ? await loader.loadAndSplit(textSplitter) : await loader.load()

        if (metadata) {
            const parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
            return docs.map((doc) => {
                return {
                    ...doc,
                    metadata: {
                        ...doc.metadata,
                        ...parsedMetadata
                    }
                }
            })
        }

        return docs
    }
}

module.exports = { nodeClass: Github_DocumentLoaders }
