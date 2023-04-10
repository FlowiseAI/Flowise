import { INode, INodeData, INodeParams } from '../../../src/Interface'

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
        this.type = 'Github'
        this.icon = 'github.png'
        this.category = 'Document Loaders'
        this.description = `Load data from a GitHub repository`
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
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            }
        ]
    }

    async getBaseClasses(): Promise<string[]> {
        return ['Document']
    }

    async init(nodeData: INodeData): Promise<any> {
        const { GithubRepoLoader } = await import('langchain/document_loaders')

        const repoLink = nodeData.inputs?.repoLink as string
        const branch = nodeData.inputs?.branch as string
        const accessToken = nodeData.inputs?.accessToken as string
        const textSplitter = nodeData.inputs?.textSplitter

        const options = {
            branch,
            recursive: false,
            unknown: 'warn'
        } as any

        if (accessToken) options.accessToken = accessToken

        const loader = new GithubRepoLoader(repoLink, options)

        if (textSplitter) {
            const docs = await loader.loadAndSplit(textSplitter)
            return docs
        } else {
            const docs = await loader.load()
            return docs
        }
    }
}

module.exports = { nodeClass: Github_DocumentLoaders }
