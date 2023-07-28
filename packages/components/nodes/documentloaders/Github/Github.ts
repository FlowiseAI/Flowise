import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { GithubRepoLoader, GithubRepoLoaderParams } from 'langchain/document_loaders/web/github'
import { getCredentialData, getCredentialParam } from '../../../src'

class Github_DocumentLoaders implements INode {
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
        this.label = 'Github'
        this.name = 'github'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'github.png'
        this.category = 'Document Loaders'
        this.description = `Load data from a GitHub repository`
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            description: 'Only needed when accessing private repo',
            optional: true,
            credentialNames: ['githubApi']
        }
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

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const repoLink = nodeData.inputs?.repoLink as string
        const branch = nodeData.inputs?.branch as string
        const recursive = nodeData.inputs?.recursive as boolean
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const metadata = nodeData.inputs?.metadata

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const accessToken = getCredentialParam('accessToken', credentialData, nodeData)

        const githubOptions: GithubRepoLoaderParams = {
            branch,
            recursive,
            unknown: 'warn'
        }

        if (accessToken) githubOptions.accessToken = accessToken

        const loader = new GithubRepoLoader(repoLink, githubOptions)
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
