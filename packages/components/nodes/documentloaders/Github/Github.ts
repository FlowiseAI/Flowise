import { omit } from 'lodash'
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
        this.version = 2.0
        this.type = 'Document'
        this.icon = 'github.svg'
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
                label: 'Max Concurrency',
                name: 'maxConcurrency',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Ignore Paths',
                name: 'ignorePath',
                description: 'An array of paths to be ignored',
                placeholder: `["*.md"]`,
                type: 'string',
                rows: 4,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Max Retries',
                name: 'maxRetries',
                description:
                    'The maximum number of retries that can be made for a single call, with an exponential backoff between each attempt. Defaults to 2.',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Additional Metadata',
                name: 'metadata',
                type: 'json',
                description: 'Additional metadata to be added to the extracted documents',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Omit Metadata Keys',
                name: 'omitMetadataKeys',
                type: 'string',
                rows: 4,
                description:
                    'Each document loader comes with a default set of metadata keys that are extracted from the document. You can use this field to omit some of the default metadata keys. The value should be a list of keys, seperated by comma. Use * to omit all metadata keys execept the ones you specify in the Additional Metadata field',
                placeholder: 'key1, key2, key3.nestedKey1',
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
        const maxConcurrency = nodeData.inputs?.maxConcurrency as string
        const maxRetries = nodeData.inputs?.maxRetries as string
        const ignorePath = nodeData.inputs?.ignorePath as string
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const accessToken = getCredentialParam('accessToken', credentialData, nodeData)

        const githubOptions: GithubRepoLoaderParams = {
            branch,
            recursive,
            unknown: 'warn'
        }

        if (accessToken) githubOptions.accessToken = accessToken
        if (maxConcurrency) githubOptions.maxConcurrency = parseInt(maxConcurrency, 10)
        if (maxRetries) githubOptions.maxRetries = parseInt(maxRetries, 10)
        if (ignorePath) githubOptions.ignorePaths = JSON.parse(ignorePath)

        const loader = new GithubRepoLoader(repoLink, githubOptions)
        let docs = textSplitter ? await loader.loadAndSplit(textSplitter) : await loader.load()

        if (metadata) {
            const parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
            docs = docs.map((doc) => ({
                ...doc,
                metadata:
                    _omitMetadataKeys === '*'
                        ? {
                              ...parsedMetadata
                          }
                        : omit(
                              {
                                  ...doc.metadata,
                                  ...parsedMetadata
                              },
                              omitMetadataKeys
                          )
            }))
        } else {
            docs = docs.map((doc) => ({
                ...doc,
                metadata:
                    _omitMetadataKeys === '*'
                        ? {}
                        : omit(
                              {
                                  ...doc.metadata
                              },
                              omitMetadataKeys
                          )
            }))
        }

        return docs
    }
}

module.exports = { nodeClass: Github_DocumentLoaders }
