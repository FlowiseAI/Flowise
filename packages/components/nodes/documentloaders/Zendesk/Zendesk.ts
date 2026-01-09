import { omit } from 'lodash'
import axios from 'axios'
import { ICommonObject, IDocument, INode, INodeData, INodeParams, INodeOutputsValue } from '../../../src/Interface'
import { getCredentialData, getCredentialParam, handleEscapeCharacters } from '../../../src'
import { BaseDocumentLoader } from 'langchain/document_loaders/base'

interface ZendeskConfig {
    zendeskDomain: string
    user?: string
    token?: string
    brandId?: string
    publishedArticlesOnly: boolean
    locales: string[]
    charsPerToken: number
    api: {
        protocol: string
        helpCenterPath: string
        articlesEndpoint: string
        publicPath: string
    }
    defaultTitle: string
    chunking: {
        maxTokens: number
        chunkSize: number
        overlap: number
    }
}

interface Chunk {
    content: string
    index: number
    tokenSize: number
}

interface ZendeskArticle {
    id: number
    name?: string
    title?: string
    body?: string
}

interface ZendeskArticlesResponse {
    articles?: ZendeskArticle[]
    next_page?: string
}

class Zendesk_DocumentLoaders implements INode {
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
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Zendesk'
        this.name = 'zendesk'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'zendesk.svg'
        this.category = 'Document Loaders'
        this.description = `Load articles from Zendesk Knowledge Base`
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            description: 'Zendesk API Credential',
            credentialNames: ['zendeskApi']
        }
        this.inputs = [
            {
                label: 'Zendesk Domain',
                name: 'zendeskDomain',
                type: 'string',
                placeholder: 'example.zendesk.com',
                description: 'Your Zendesk domain (e.g., example.zendesk.com)'
            },
            {
                label: 'Brand ID',
                name: 'brandId',
                type: 'string',
                optional: true,
                placeholder: '123456',
                description: 'Optional brand ID to filter articles'
            },
            {
                label: 'Locale',
                name: 'locale',
                type: 'string',
                default: 'en-us',
                optional: true,
                placeholder: 'en-us',
                description: 'Locale code(s) for articles. Can be a single locale (e.g., en-us) or comma-separated list (e.g., en-us, en-gb, fr-fr). Defaults to en-us if not provided.'
            },
            {
                label: 'Published Articles Only',
                name: 'publishedArticlesOnly',
                type: 'boolean',
                default: true,
                optional: true,
                description: 'Only load published articles'
            },
            {
                label: 'Characters Per Token',
                name: 'charsPerToken',
                type: 'number',
                default: 4,
                optional: true,
                description: 'Approximate characters per token for size estimation',
                step: 1
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
                    'Each document loader comes with a default set of metadata keys that are extracted from the document. You can use this field to omit some of the default metadata keys. The value should be a list of keys, seperated by comma. Use * to omit all metadata keys except the ones you specify in the Additional Metadata field',
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
        const zendeskDomain = nodeData.inputs?.zendeskDomain as string
        const brandId = nodeData.inputs?.brandId as string
        const localeInputRaw = nodeData.inputs?.locale as string
        const localeInput = (localeInputRaw && localeInputRaw.trim()) || 'en-us'
        const publishedArticlesOnly = (nodeData.inputs?.publishedArticlesOnly as boolean) ?? true
        const charsPerToken = (nodeData.inputs?.charsPerToken as number) ?? 4
        const metadata = nodeData.inputs?.metadata
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string
        const output = nodeData.outputs?.output as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        // Parse comma-separated locales
        const locales = localeInput
            .split(',')
            .map((loc) => loc.trim())
            .filter((loc) => loc.length > 0)

        // Ensure at least one locale
        if (locales.length === 0) {
            locales.push('en-us')
        }

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const user = getCredentialParam('user', credentialData, nodeData)
        const token = getCredentialParam('token', credentialData, nodeData)

        // Build configuration
        const config: ZendeskConfig = {
            zendeskDomain,
            user,
            token,
            brandId,
            publishedArticlesOnly,
            locales,
            charsPerToken,
            api: {
                protocol: 'https://',
                helpCenterPath: '/api/v2/help_center/',
                articlesEndpoint: 'articles.json',
                publicPath: '/hc/'
            },
            defaultTitle: 'Untitled',
            chunking: {
                maxTokens: 3000,
                chunkSize: 1000,
                overlap: 200
            }
        }

        const loader = new ZendeskLoader(config)

        // Extract articles
        let docs: IDocument[] = await loader.load()

        // Apply metadata handling
        let parsedMetadata = {}

        if (metadata) {
            try {
                parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
            } catch (error) {
                throw new Error(`Error parsing Additional Metadata: ${error.message}`)
            }
        }

        docs = docs.map((doc) => ({
            ...doc,
            metadata:
                _omitMetadataKeys === '*'
                    ? { ...parsedMetadata }
                    : omit(
                          {
                              ...doc.metadata,
                              ...parsedMetadata
                          },
                          omitMetadataKeys
                      )
        }))

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

class ZendeskLoader extends BaseDocumentLoader {
    private config: ZendeskConfig

    constructor(config: ZendeskConfig) {
        super()
        this.config = config
        this.validateConfig(this.config)
    }

    /**
     * Validate configuration
     */
    private validateConfig(config: Partial<ZendeskConfig>): void {
        const errors: string[] = []

        if (!config.zendeskDomain) {
            errors.push('Zendesk domain is required')
        } else if (!config.zendeskDomain.match(/^.+\.zendesk\.com$/)) {
            errors.push('Zendesk domain must be a valid zendesk.com domain (e.g., example.zendesk.com)')
        }

        if (!config.token) {
            errors.push('Zendesk auth token is required')
        }

        if (config.user && !config.user.includes('@')) {
            errors.push('Zendesk auth user must be a valid email address')
        }

        if (config.brandId && !/^\d+$/.test(config.brandId)) {
            errors.push('Brand ID must be a numeric string')
        }

        if (!config.locales || !config.locales.length || !config.locales[0]) {
            errors.push('Locale is required')
        }

        if (errors.length > 0) {
            const errorMessage = 'Configuration validation failed:\n  • ' + errors.join('\n  • ')
            throw new Error(errorMessage)
        }
    }

    /**
     * Helper to fetch all articles with pagination
     */
    private async fetchAllArticles(
        locale: string,
        brandId: string | undefined,
        config: ZendeskConfig,
        axiosHeaders: Record<string, string>
    ): Promise<ZendeskArticle[]> {
        const allArticles: ZendeskArticle[] = []
        let page = 1
        let hasMore = true
        const baseUri = `${config.api.protocol}${config.zendeskDomain}${config.api.helpCenterPath}`

        while (hasMore) {
            let articlesUri = `${baseUri}${config.api.articlesEndpoint}?locale=${locale}&page=${page}`

            // Add status filter if publishedOnly is true
            if (config.publishedArticlesOnly) {
                articlesUri += '&status=published'
            }

            if (brandId) {
                articlesUri += `&brand_id=${brandId}`
            }

            try {
                const resp = await axios.get<ZendeskArticlesResponse>(articlesUri, { headers: axiosHeaders })
                const data = resp.data

                if (data.articles && data.articles.length > 0) {
                    allArticles.push(...data.articles)
                    page++
                    hasMore = !!data.next_page
                } else {
                    hasMore = false
                }
            } catch (error: any) {
                if (error.response) {
                    const status = error.response.status
                    const statusText = error.response.statusText

                    if (status === 401) {
                        throw new Error(`Authentication failed (${status}): Please check your Zendesk credentials`)
                    } else if (status === 403) {
                        throw new Error(
                            `Access forbidden (${status}): You don't have permission to access this Zendesk instance`
                        )
                    } else if (status === 404) {
                        throw new Error(`Not found (${status}): The Zendesk URL or brand ID may be incorrect`)
                    } else if (status >= 500) {
                        throw new Error(`Zendesk server error (${status}): ${statusText}. Please try again later`)
                    } else {
                        throw new Error(`HTTP error (${status}): ${statusText}`)
                    }
                } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                    throw new Error(
                        `Network error: Cannot connect to Zendesk. Please check the domain: ${config.zendeskDomain}`
                    )
                } else {
                    throw new Error(`Request failed: ${error.message}`)
                }
            }
        }

        return allArticles
    }

    /**
     * Build article URL from domain and article details
     */
    private buildArticleUrl(config: ZendeskConfig, locale: string, articleId: number): string | null {
        if (!config.zendeskDomain || !articleId) {
            return null
        }

        return `${config.api.protocol}${config.zendeskDomain}${config.api.publicPath}${locale}/articles/${articleId}`
    }

    /**
     * Chunk text content based on token limits
     */
    private chunkContent(content: string, chunkSize: number, overlap: number, charsPerToken: number): Chunk[] {
        const chunks: Chunk[] = []
        const contentLength = content.length
        const chunkCharSize = chunkSize * charsPerToken
        const overlapCharSize = overlap * charsPerToken

        let start = 0
        let chunkIndex = 0

        while (start < contentLength) {
            const end = Math.min(start + chunkCharSize, contentLength)
            const chunk = content.substring(start, end)

            chunks.push({
                content: chunk,
                index: chunkIndex,
                tokenSize: Math.ceil(chunk.length / charsPerToken)
            })

            chunkIndex++

            // Move start position, accounting for overlap
            if (end >= contentLength) break
            start = end - overlapCharSize
        }

        return chunks
    }

    /**
     * Transform article to required format with chunking support
     */
    private transformArticle(article: ZendeskArticle, config: ZendeskConfig, locale: string): IDocument[] {
        const articleUrl = this.buildArticleUrl(config, locale, article.id)
        const content = article.body || ''
        const tokenSize = Math.ceil(content.length / config.charsPerToken)
        const title = article.name || article.title || config.defaultTitle
        const articleId = String(article.id)

        // If article is small enough, return as single document
        if (tokenSize <= config.chunking.maxTokens) {
            return [
                {
                    pageContent: content,
                    metadata: {
                        title: title,
                        url: articleUrl,
                        id: articleId
                    }
                }
            ]
        }

        // Article needs chunking
        const chunks = this.chunkContent(
            content,
            config.chunking.chunkSize,
            config.chunking.overlap,
            config.charsPerToken
        )

        return chunks.map((chunk) => ({
            pageContent: chunk.content,
            metadata: {
                title: title,
                url: articleUrl,
                id: `${articleId}-${chunk.index + 1}`
            }
        }))
    }

    /**
     * Extract all articles from Zendesk
     */
    private async extractAllArticles(config: ZendeskConfig): Promise<IDocument[]> {
        const allTransformedArticles: IDocument[] = []

        // Setup authentication headers
        let axiosHeaders: Record<string, string> = {}
        if (config.user && config.token) {
            const authString = `${config.user}/token:${config.token}`
            const encoded = Buffer.from(authString).toString('base64')
            axiosHeaders = {
                Authorization: `Basic ${encoded}`
            }
        }

        // Process each locale
        for (const locale of config.locales) {
            const articles = await this.fetchAllArticles(locale, config.brandId || undefined, config, axiosHeaders)
            // Transform each article to the required format
            for (const article of articles) {
                const transformedChunks = this.transformArticle(article, config, locale)
                // Process each chunk (will be 1 chunk for small articles)
                for (const chunk of transformedChunks) {
                    allTransformedArticles.push(chunk)
                }
            }
        }

        return allTransformedArticles
    }

    async load(): Promise<IDocument[]> {
        return await this.extractAllArticles(this.config)
    }
}

module.exports = { nodeClass: Zendesk_DocumentLoaders }

