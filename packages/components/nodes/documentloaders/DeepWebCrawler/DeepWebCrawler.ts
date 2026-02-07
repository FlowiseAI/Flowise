import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { Document } from 'langchain/document'
import { deepCrawlToDocuments } from './core'

class DeepWebCrawler_DocumentLoaders implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    author: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Deep Web Crawler'
        this.name = 'deepWebCrawler'
        this.version = 1.1
        this.type = 'Document'
        this.icon = 'crawler.svg'
        this.category = 'Document Loaders'
        this.author = 'Arctur BC'
        this.description =
            'Crawl a website (links + optional sitemap), extract readable content, and remove repeated boilerplate blocks across pages.'
        this.baseClasses = [this.type, ...getBaseClasses(Document)]
        this.inputs = [
            {
                label: 'Start URL',
                name: 'startUrl',
                type: 'string',
                placeholder: 'https://example.com/docs',
                optional: false
            },
            {
                label: 'Crawl Mode',
                name: 'crawlMode',
                type: 'options',
                options: [
                    { label: 'Links (HTML crawl)', name: 'links', description: 'Crawl links discovered from HTML pages' },
                    {
                        label: 'Sitemap (sitemap.xml)',
                        name: 'sitemap',
                        description: 'Discover pages from sitemap.xml (and sitemap index)'
                    },
                    { label: 'Both', name: 'both', description: 'Use both HTML crawling and sitemap discovery' }
                ],
                default: 'both'
            },
            {
                label: 'Render JavaScript (Chromium)',
                name: 'renderJs',
                type: 'boolean',
                default: true,
                optional: true,
                description: 'Use Chromium (via Puppeteer) to load pages. Recommended for dynamic sites.'
            },
            {
                label: 'Max Pages (0 = unlimited)',
                name: 'maxPages',
                type: 'number',
                default: 200
            },
            {
                label: 'Max Depth',
                name: 'maxDepth',
                type: 'number',
                default: 3,
                description: 'Only used for link crawling; sitemap mode ignores depth.'
            },
            {
                label: 'Same Domain Only',
                name: 'sameDomainOnly',
                type: 'boolean',
                default: true,
                optional: true
            },
            {
                label: 'Include URL Regex',
                name: 'includeRegex',
                type: 'string',
                optional: true,
                placeholder: '(/docs/|/help/)'
            },
            {
                label: 'Exclude URL Regex',
                name: 'excludeRegex',
                type: 'string',
                optional: true,
                placeholder: '(\\\\?.*|/logout|/signin)'
            },
            {
                label: 'Strip Selectors (CSS, comma-separated)',
                name: 'stripSelectors',
                type: 'string',
                optional: true,
                placeholder:
                    'nav,header,footer,aside,[role="navigation"],.cookie-banner,[id*="cookie"],[class*="cookie"]',
                description:
                    'Elements matching these selectors will be removed before text extraction to reduce menus/footers/cookie banners.'
            },
            {
                label: 'Remove Common Blocks Across Pages',
                name: 'dedupeCommonBlocks',
                type: 'boolean',
                default: true,
                description:
                    'After crawling, removes paragraphs that appear on many pages (e.g., global footer text).'
            },
            {
                label: 'Common Block Threshold (0-1)',
                name: 'commonBlockThreshold',
                type: 'number',
                default: 0.5,
                description: 'Example: 0.5 removes blocks that appear on ≥50% of pages.'
            },
            {
                label: 'Min Block Characters',
                name: 'minBlockChars',
                type: 'number',
                default: 80,
                description: 'Only blocks with at least this many characters are considered for common-block removal.'
            },
            {
                label: 'Respect robots.txt',
                name: 'respectRobots',
                type: 'boolean',
                default: false,
                optional: true
            },
            {
                label: 'Concurrency',
                name: 'concurrency',
                type: 'number',
                default: 3
            },
            {
                label: 'Delay (ms) between requests',
                name: 'delayMs',
                type: 'number',
                default: 1000
            },
            {
                label: 'Timeout (ms)',
                name: 'timeoutMs',
                type: 'number',
                default: 45000
            }
        ]
    }

    async init(nodeData: INodeData): Promise<Document[]> {
        const startUrl = String(nodeData.inputs?.startUrl ?? '').trim()
        if (!startUrl) throw new Error('Start URL is required')

        const crawlMode = String(nodeData.inputs?.crawlMode ?? 'both')
        const renderJs = Boolean(nodeData.inputs?.renderJs ?? true)
        const maxPages = Number(nodeData.inputs?.maxPages ?? 200)
        const maxDepth = Number(nodeData.inputs?.maxDepth ?? 3)
        const sameDomainOnly = Boolean(nodeData.inputs?.sameDomainOnly ?? true)
        const includeRegex = String(nodeData.inputs?.includeRegex ?? '').trim()
        const excludeRegex = String(nodeData.inputs?.excludeRegex ?? '').trim()
        const stripSelectors = String(nodeData.inputs?.stripSelectors ?? '').trim()
        const dedupeCommonBlocks = Boolean(nodeData.inputs?.dedupeCommonBlocks ?? true)
        const commonBlockThreshold = Number(nodeData.inputs?.commonBlockThreshold ?? 0.5)
        const minBlockChars = Number(nodeData.inputs?.minBlockChars ?? 80)
        const respectRobots = Boolean(nodeData.inputs?.respectRobots ?? false)
        const concurrency = Number(nodeData.inputs?.concurrency ?? 3)
        const delayMs = Number(nodeData.inputs?.delayMs ?? 1000)
        const timeoutMs = Number(nodeData.inputs?.timeoutMs ?? 45000)

        return deepCrawlToDocuments({
            startUrl,
            crawlMode: crawlMode as 'links' | 'sitemap' | 'both',
            renderJs,
            maxPages,
            maxDepth,
            sameDomainOnly,
            includeRegex,
            excludeRegex,
            stripSelectors,
            dedupeCommonBlocks,
            commonBlockThreshold,
            minBlockChars,
            respectRobots,
            concurrency,
            delayMs,
            timeoutMs
        })
    }
}

module.exports = { nodeClass: DeepWebCrawler_DocumentLoaders }
