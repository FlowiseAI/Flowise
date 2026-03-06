import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

const defaultDesc =
    'A context-engineered web search tool powered by Seltz. Useful for when you need to answer questions using fast, up-to-date web knowledge with sources for real-time AI reasoning. Input should be a search query. Output is a JSON array of documents with url and content fields.'

class SeltzSearch_Tools implements INode {
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
        this.label = 'Seltz Search'
        this.name = 'seltzSearch'
        this.version = 1.0
        this.type = 'SeltzSearch'
        this.icon = 'seltz.svg'
        this.category = 'Tools'
        this.description = 'Wrapper around Seltz Web Knowledge API - context-engineered web content with sources for real-time AI reasoning'
        this.inputs = [
            {
                label: 'Tool Description',
                name: 'toolDescription',
                type: 'string',
                rows: 4,
                default: defaultDesc,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Max Documents',
                name: 'maxDocuments',
                type: 'number',
                description: 'Maximum number of documents to return',
                optional: true,
                step: 1,
                additionalParams: true
            },
            {
                label: 'Context',
                name: 'context',
                type: 'string',
                description: 'Additional context to refine the search',
                rows: 2,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Profile',
                name: 'profile',
                type: 'string',
                description: 'Search profile to use',
                optional: true,
                additionalParams: true
            }
        ]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['seltzApi']
        }
        this.baseClasses = [this.type, ...getBaseClasses(SeltzSearchTool)]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const seltzApiKey = getCredentialParam('seltzApiKey', credentialData, nodeData)

        const toolDescription = nodeData.inputs?.toolDescription as string
        const maxDocuments = nodeData.inputs?.maxDocuments as string
        const context = nodeData.inputs?.context as string
        const profile = nodeData.inputs?.profile as string

        const tool = new SeltzSearchTool({
            apiKey: seltzApiKey,
            maxDocuments: maxDocuments ? parseInt(maxDocuments, 10) : undefined,
            context: context || undefined,
            profile: profile || undefined
        })

        if (toolDescription) tool.description = toolDescription

        return tool
    }
}

class SeltzSearchTool extends Tool {
    static lc_name() {
        return 'SeltzSearchTool'
    }

    name = 'seltz-search'
    description = defaultDesc

    private apiKey: string
    private maxDocuments?: number
    private context?: string
    private profile?: string

    constructor({ apiKey, maxDocuments, context, profile }: { apiKey: string; maxDocuments?: number; context?: string; profile?: string }) {
        super()
        this.apiKey = apiKey
        this.maxDocuments = maxDocuments
        this.context = context
        this.profile = profile
    }

    async _call(input: string): Promise<string> {
        const { Seltz } = await import('seltz')
        const client = new Seltz({ apiKey: this.apiKey })

        const searchOptions: Record<string, any> = {}
        if (this.maxDocuments) {
            searchOptions.includes = { maxDocuments: this.maxDocuments }
        }
        if (this.context) {
            searchOptions.context = this.context
        }
        if (this.profile) {
            searchOptions.profile = this.profile
        }

        const response = await client.search(input, Object.keys(searchOptions).length > 0 ? searchOptions : undefined)

        if (!response.documents || response.documents.length === 0) {
            return 'No results found.'
        }

        const results = response.documents.map((doc: any) => ({
            url: doc.url || '',
            content: doc.content || ''
        }))

        return JSON.stringify(results)
    }
}

module.exports = { nodeClass: SeltzSearch_Tools, SeltzSearchTool }
