import { SearxngSearch } from '@langchain/community/tools/searxng_search'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'

class Searxng_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'SearXNG'
        this.name = 'searXNG'
        this.version = 1.0
        this.type = 'SearXNG'
        this.icon = 'SearXNG.svg'
        this.category = 'Tools'
        this.description = 'Wrapper around SearXNG - a free internet metasearch engine'
        this.inputs = [
            {
                label: 'Base URL',
                name: 'apiBase',
                type: 'string',
                default: 'http://searxng:8080'
            },
            {
                label: 'Categories',
                name: 'categories',
                description:
                    'Comma separated list, specifies the active search categories. (see <a target="_blank" href="https://docs.searxng.org/user/configured_engines.html#configured-engines">Configured Engines</a>)',
                optional: true,
                additionalParams: true,
                type: 'string'
            },
            {
                label: 'Engines',
                name: 'engines',
                description:
                    'Comma separated list, specifies the active search engines. (see <a target="_blank" href="https://docs.searxng.org/user/configured_engines.html#configured-engines">Configured Engines</a>)',
                optional: true,
                additionalParams: true,
                type: 'string'
            },
            {
                label: 'Language',
                name: 'language',
                description: 'Code of the language.',
                optional: true,
                additionalParams: true,
                type: 'string'
            },
            {
                label: 'Page No.',
                name: 'pageno',
                description: 'Search page number.',
                optional: true,
                additionalParams: true,
                type: 'number'
            },
            {
                label: 'Time Range',
                name: 'time_range',
                description:
                    'Time range of search for engines which support it. See if an engine supports time range search in the preferences page of an instance.',
                optional: true,
                additionalParams: true,
                type: 'string'
            },
            {
                label: 'Safe Search',
                name: 'safesearch',
                description:
                    'Filter search results of engines which support safe search. See if an engine supports safe search in the preferences page of an instance.',
                optional: true,
                additionalParams: true,
                type: 'number'
            }
        ]
        this.baseClasses = [this.type, ...getBaseClasses(SearxngSearch)]
    }

    async init(nodeData: INodeData, _: string): Promise<any> {
        const apiBase = nodeData.inputs?.apiBase as string
        const categories = nodeData.inputs?.categories as string
        const engines = nodeData.inputs?.engines as string
        const language = nodeData.inputs?.language as string
        const pageno = nodeData.inputs?.pageno as number
        const time_range = nodeData.inputs?.time_range as string
        const safesearch = nodeData.inputs?.safesearch as 0 | 1 | 2 | undefined
        const format = 'json' as 'json'

        const params = {
            format,
            categories,
            engines,
            language,
            pageno,
            time_range,
            safesearch
        }

        const headers = {}

        const tool = new SearxngSearch({
            apiBase,
            params,
            headers
        })

        return tool
    }
}

module.exports = { nodeClass: Searxng_Tools }
