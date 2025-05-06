import { TextSplitter } from 'langchain/text_splitter'
import omit from 'lodash/omit'
import { CheerioWebBaseLoader, WebBaseLoaderParams } from '@langchain/community/document_loaders/web/cheerio'
import { Document } from '@langchain/core/documents'
import { test } from 'linkifyjs'
import { parse } from 'css-what'
import { SelectorType } from 'cheerio'
import { ICommonObject, INodeOutputsValue, IDocument, INode, INodeData, INodeParams } from '../../../src/Interface'
import { handleEscapeCharacters, webCrawl, xmlScrape } from '../../../src/utils'

class CustomCheerioLoader extends CheerioWebBaseLoader {
    // Additional parameters for customizing the loader's behavior
    private otherParams: { outputFormat?: string; excludeSelector?: string }

    /**
     * Constructs a new instance of CustomCheerioLoader.
     * @param webPath - The URL or path to the web resource.
     * @param fields - Parameters for the web base loader.
     * @param otherParams - Additional parameters including output format and exclude selector.
     */
    constructor(webPath: string, fields: WebBaseLoaderParams, otherParams: { outputFormat?: string; excludeSelector?: string }) {
        super(webPath, fields)
        this.otherParams = otherParams
    }

    /**
     * Loads the document from the web resource.
     * This function overrides the default load function of CheerioWebBaseLoader.
     * It adds functionality to exclude certain selectors and supports multiple output formats, which the Langchain load function does not currently allow.
     * @returns A promise that resolves to an array of Document objects.
     */
    async load(): Promise<Document[]> {
        const $ = await this.scrape()

        // Remove elements matching the exclude selector if specified
        if (this.otherParams?.excludeSelector) {
            $(this.otherParams.excludeSelector).remove()
        }

        // Determine the content format based on the specified output format
        const content = this.otherParams?.outputFormat === 'html' ? $(this.selector).html() ?? '' : $(this.selector).text()

        // Create metadata for the document
        const metadata = { source: this.webPath }

        // Return the document with the extracted content and metadata
        return [new Document({ pageContent: content, metadata })]
    }
}

class Cheerio_DocumentLoaders implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Cheerio Web Scraper'
        this.name = 'cheerioWebScraper'
        this.version = 2.0
        this.type = 'Document'
        this.icon = 'cheerio.svg'
        this.category = 'Document Loaders'
        this.description = `Load data from webpages`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'URL',
                name: 'url',
                type: 'string'
            },
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Get Relative Links Method',
                name: 'relativeLinksMethod',
                type: 'options',
                description: 'Select a method to retrieve relative links',
                options: [
                    {
                        label: 'Web Crawl',
                        name: 'webCrawl',
                        description: 'Crawl relative links from HTML URL'
                    },
                    {
                        label: 'Scrape XML Sitemap',
                        name: 'scrapeXMLSitemap',
                        description: 'Scrape relative links from XML sitemap URL'
                    }
                ],
                default: 'webCrawl',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Get Relative Links Limit',
                name: 'limit',
                type: 'number',
                optional: true,
                default: '10',
                additionalParams: true,
                description:
                    'Only used when "Get Relative Links Method" is selected. Set 0 to retrieve all relative links, default limit is 10.',
                warning: `Retrieving all links might take long time, and all links will be upserted again if the flow's state changed (eg: different URL, chunk size, etc)`
            },
            {
                label: 'Selector (CSS)',
                name: 'selector',
                type: 'string',
                description: 'Specify a CSS selector to select the content to be extracted',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Excluded Selectors (CSS)',
                name: 'excludeSelector',
                type: 'string',
                description: 'Specify a CSS selector to select the content to NOT be extracted',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Output Format (Pre-Split)',
                name: 'outputFormat',
                type: 'options',
                description:
                    'What format should it return the webpage content prior to splitting?   Useful for the HTML to Markdown Splitter',
                options: [
                    {
                        label: 'Text',
                        name: 'text',
                        description: 'Returns the text of the webpage'
                    },
                    {
                        label: 'HTML',
                        name: 'html',
                        description: 'Returns the HTML of the webpage'
                    }
                ],
                default: 'text',
                optional: false,
                additionalParams: true
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
        this.outputs = [
            {
                label: 'Document',
                name: 'document',
                description: 'Array of document objects containing metadata and pageContent',
                baseClasses: [...this.baseClasses, 'json']
            },
            {
                label: 'Text',
                name: 'text',
                description: 'Concatenated string from pageContent of documents',
                baseClasses: ['string', 'json']
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const metadata = nodeData.inputs?.metadata
        const relativeLinksMethod = nodeData.inputs?.relativeLinksMethod as string
        const selectedLinks = nodeData.inputs?.selectedLinks as string[]
        const outputFormat = nodeData.inputs?.outputFormat as string
        const excludeSelector: SelectorType = nodeData.inputs?.excludeSelector as SelectorType

        const outputParams = { outputFormat, excludeSelector }
        let limit = parseInt(nodeData.inputs?.limit as string)
        const output = nodeData.outputs?.output as string

        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        let url = nodeData.inputs?.url as string
        url = url.trim()
        if (!test(url)) {
            throw new Error('Invalid URL')
        }

        let params: WebBaseLoaderParams = {}

        const selector: SelectorType = nodeData.inputs?.selector as SelectorType
        if (selector) {
            parse(selector) // comes with cheerio - will throw error if invalid
            params['selector'] = selector
        }

        async function cheerioLoader(url: string): Promise<any> {
            try {
                let docs: IDocument[] = []
                if (url.endsWith('.pdf')) {
                    if (process.env.DEBUG === 'true') options.logger.info(`CheerioWebBaseLoader does not support PDF files: ${url}`)
                    return docs
                }

                const loader: CustomCheerioLoader = new CustomCheerioLoader(url, params, outputParams)
                docs = await loader.load()

                if (textSplitter) {
                    docs = await textSplitter.splitDocuments(docs)
                }
                return docs
            } catch (err) {
                if (process.env.DEBUG === 'true') options.logger.error(`error in CheerioWebBaseLoader: ${err.message}, on page: ${url}`)
                return []
            }
        }

        let docs: IDocument[] = []

        if (relativeLinksMethod) {
            if (process.env.DEBUG === 'true') options.logger.info(`Start ${relativeLinksMethod}`)
            // if limit is 0 we don't want it to default to 10 so we check explicitly for null or undefined
            // so when limit is 0 we can fetch all the links
            if (limit === null || limit === undefined) limit = 10
            else if (limit < 0) throw new Error('Limit cannot be less than 0')
            const pages: string[] =
                selectedLinks && selectedLinks.length > 0
                    ? selectedLinks.slice(0, limit === 0 ? undefined : limit)
                    : relativeLinksMethod === 'webCrawl'
                    ? await webCrawl(url, limit)
                    : await xmlScrape(url, limit)
            if (process.env.DEBUG === 'true') options.logger.info(`pages: ${JSON.stringify(pages)}, length: ${pages.length}`)
            if (!pages || pages.length === 0) throw new Error('No relative links found')
            for (const page of pages) {
                docs.push(...(await cheerioLoader(page)))
            }
            if (process.env.DEBUG === 'true') options.logger.info(`Finish ${relativeLinksMethod}`)
        } else if (selectedLinks && selectedLinks.length > 0) {
            if (process.env.DEBUG === 'true')
                options.logger.info(`pages: ${JSON.stringify(selectedLinks)}, length: ${selectedLinks.length}`)
            for (const page of selectedLinks.slice(0, limit)) {
                docs.push(...(await cheerioLoader(page)))
            }
        } else {
            docs = await cheerioLoader(url)
        }

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

        if (output === 'document') {
            return docs
        } else {
            let finaltext = ''
            for (const doc of docs) {
                finaltext += `${doc.pageContent}\n`
            }
            return handleEscapeCharacters(finaltext, false)
        }
    }
}

module.exports = { nodeClass: Cheerio_DocumentLoaders }
