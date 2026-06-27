import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { SerperTool } from './core'

class Serper_Tools implements INode {
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
        this.label = 'Serper'
        this.name = 'serper'
        this.version = 2.0
        this.type = 'Serper'
        this.icon = 'serper.svg'
        this.category = 'Tools'
        this.description = 'Access the full Serper.dev Google API — Web Search, News, Images, Videos, Places, Maps, Shopping, Scholar, Patents, Autocomplete & Web Scraping'
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['serperApi']
        }
        this.inputs = [
            {
                label: 'Search Endpoint',
                name: 'endpoint',
                type: 'options',
                options: [
                    { label: 'Web Search', name: 'search', description: 'Standard Google web search results' },
                    { label: 'News', name: 'news', description: 'Google News articles and headlines' },
                    { label: 'Images', name: 'images', description: 'Google Image search' },
                    { label: 'Videos', name: 'videos', description: 'Google Video search (YouTube, etc.)' },
                    { label: 'Places', name: 'places', description: 'Google Places — local business search' },
                    { label: 'Maps', name: 'maps', description: 'Google Maps search with coordinates support' },
                    { label: 'Shopping', name: 'shopping', description: 'Google Shopping — product & price search' },
                    { label: 'Scholar', name: 'scholar', description: 'Google Scholar — academic papers & research' },
                    { label: 'Patents', name: 'patents', description: 'Google Patents search' },
                    { label: 'Autocomplete', name: 'autocomplete', description: 'Google search query suggestions' },
                    { label: 'Web Scrape', name: 'scrape', description: 'Extract text content from a URL (5 credits/request, uses scrape.serper.dev)' }
                ],
                default: 'search',
                description: 'The Serper API endpoint to use for this tool'
            },
            {
                label: 'Country (gl)',
                name: 'gl',
                type: 'string',
                optional: true,
                additionalParams: true,
                placeholder: 'us',
                description: 'Google country code to localize results (ISO 3166-1 alpha-2). Examples: us, gb, de, fr, jp, au, ca, es, it, br. Leave empty for global results.'
            },
            {
                label: 'Language (hl)',
                name: 'hl',
                type: 'string',
                optional: true,
                additionalParams: true,
                placeholder: 'en',
                description: 'Interface language code (ISO 639-1). Examples: en, de, fr, es, ja, ko, pt, it, zh. Affects UI language of search results metadata.'
            },
            {
                label: 'Number of Results (num)',
                name: 'num',
                type: 'number',
                default: 10,
                optional: true,
                additionalParams: true,
                description: 'Number of results to return (1–100, default: 10). Applies to Search, News, Images, Videos, Shopping, Scholar, Patents. Higher values consume more API credits.'
            },
            {
                label: 'Page (page)',
                name: 'page',
                type: 'number',
                default: 1,
                optional: true,
                additionalParams: true,
                description: 'Page number for paginating through results (default: 1). Use with num to navigate through result sets.'
            },
            {
                label: 'Time Filter (tbs)',
                name: 'tbs',
                type: 'string',
                optional: true,
                additionalParams: true,
                placeholder: 'qdr:w',
                description: "Time-based search filter using Google's internal tbs syntax. Presets: qdr:h (past hour), qdr:d (past 24h), qdr:w (past week), qdr:m (past month), qdr:y (past year). Custom date range (Google format, MM/DD/YYYY): cdr:1,cd_min:01/01/2024,cd_max:06/30/2024. Leave empty for any time. Supports {variables}."
            },
            {
                label: 'Location',
                name: 'location',
                type: 'string',
                optional: true,
                additionalParams: true,
                placeholder: 'New York, New York, United States',
                description: 'Geographic location string to further localize search results. Examples: "London, England, United Kingdom", "Munich, Bavaria, Germany". Applies to Search and News endpoints.'
            },
            {
                label: 'Autocorrect',
                name: 'autocorrect',
                type: 'boolean',
                default: true,
                optional: true,
                additionalParams: true,
                description: 'Enable Google query autocorrection (default: true). Disable for exact-match queries.'
            },
            {
                label: 'Image Aspect Ratio (imgar)',
                name: 'imgar',
                type: 'options',
                options: [
                    { label: 'Any', name: '' },
                    { label: 'Tall (portrait)', name: 't' },
                    { label: 'Wide (landscape)', name: 'w' },
                    { label: 'Square', name: 's' },
                    { label: 'Panoramic (extra wide)', name: 'xw' }
                ],
                default: '',
                optional: true,
                additionalParams: true,
                description: 'Filter images by aspect ratio. Only applies to the Images endpoint.'
            },
            {
                label: 'Image Type (imgtype)',
                name: 'imgtype',
                type: 'options',
                options: [
                    { label: 'Any', name: '' },
                    { label: 'Photo', name: 'photo' },
                    { label: 'Face', name: 'face' },
                    { label: 'Clipart', name: 'clipart' },
                    { label: 'Line drawing', name: 'lineart' },
                    { label: 'Animated (GIF)', name: 'animated' }
                ],
                default: '',
                optional: true,
                additionalParams: true,
                description: 'Filter images by content type. Only applies to the Images endpoint.'
            },
            {
                label: 'Maps Coordinates (ll)',
                name: 'll',
                type: 'string',
                optional: true,
                additionalParams: true,
                placeholder: '@40.7504178,-73.9824837,14z',
                description: 'Latitude, longitude and zoom level for Maps endpoint. Format: @{lat},{lon},{zoom}z. Example: "@48.8566,2.3522,12z" for Paris. Only applies to the Maps endpoint.'
            }
        ]
        this.baseClasses = [this.type, ...getBaseClasses(SerperTool)]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const serperApiKey = getCredentialParam('serperApiKey', credentialData, nodeData)

        const endpoint = ((nodeData.inputs?.endpoint as string) || 'search') as any
        const gl = nodeData.inputs?.gl as string | undefined
        const hl = nodeData.inputs?.hl as string | undefined
        const num = nodeData.inputs?.num as number | undefined
        const page = nodeData.inputs?.page as number | undefined
        const tbs = nodeData.inputs?.tbs as string | undefined
        const location = nodeData.inputs?.location as string | undefined
        const autocorrect = nodeData.inputs?.autocorrect as boolean | undefined
        const imgar = nodeData.inputs?.imgar as string | undefined
        const imgtype = nodeData.inputs?.imgtype as string | undefined
        const ll = nodeData.inputs?.ll as string | undefined

        return new SerperTool({
            apiKey: serperApiKey,
            endpoint,
            ...(gl && { gl }),
            ...(hl && { hl }),
            ...(num !== undefined && { num }),
            ...(page !== undefined && { page }),
            ...(tbs && { tbs }),
            ...(location && { location }),
            ...(autocorrect !== undefined && { autocorrect }),
            ...(imgar && { imgar }),
            ...(imgtype && { imgtype }),
            ...(ll && { ll })
        })
    }
}

module.exports = { nodeClass: Serper_Tools }
