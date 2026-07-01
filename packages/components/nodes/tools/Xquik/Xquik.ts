import { convertMultiOptionsToStringArray, getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { SearchTweetsTool, XQUIK_ACTIONS, XquikTool, createXquikTools } from './core'

class XquikXData_Tools implements INode {
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
        this.label = 'Xquik X Data'
        this.name = 'xquikXData'
        this.version = 1.0
        this.type = 'XquikXData'
        this.icon = 'xquik.svg'
        this.category = 'Tools'
        this.description = 'Read-only public X/Twitter data from Xquik with provenance metadata for RAG and agent workflows'
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(SearchTweetsTool)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['xquikApi']
        }
        this.inputs = [
            {
                label: 'Actions',
                name: 'actions',
                type: 'multiOptions',
                options: [
                    {
                        label: 'Search Tweets',
                        name: 'searchTweets'
                    },
                    {
                        label: 'Get Tweet',
                        name: 'getTweet'
                    },
                    {
                        label: 'Get User',
                        name: 'getUser'
                    },
                    {
                        label: 'Search Users',
                        name: 'searchUsers'
                    },
                    {
                        label: 'List User Tweets',
                        name: 'listUserTweets'
                    },
                    {
                        label: 'Get Trends',
                        name: 'getTrends'
                    }
                ],
                description: 'Select the read-only Xquik tools to expose'
            },
            {
                label: 'Tool Description',
                name: 'description',
                type: 'string',
                rows: 4,
                optional: true,
                additionalParams: true,
                default:
                    'Use Xquik for read-only public X/Twitter data. Results include source, resource_type, id, url, retrieved_at, query, rate_limit, and pagination metadata.'
            },
            {
                label: 'Default Max Results',
                name: 'maxResults',
                type: 'number',
                optional: true,
                additionalParams: true,
                default: 20,
                description: 'Default tweet result limit for operations that support a limit parameter'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<XquikTool[]> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('xquikApiKey', credentialData, nodeData) as string
        const description = nodeData.inputs?.description as string | undefined
        const maxResults = nodeData.inputs?.maxResults as number | undefined
        const actions = convertMultiOptionsToStringArray(nodeData.inputs?.actions)

        if (!apiKey) {
            throw new Error('Xquik API key is required')
        }

        return createXquikTools({
            actions: actions.length > 0 ? actions : [...XQUIK_ACTIONS],
            apiKey,
            description,
            maxResults
        })
    }
}

module.exports = { nodeClass: XquikXData_Tools }
