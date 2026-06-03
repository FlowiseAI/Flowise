import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class OlostepScraper extends Tool {
    static lc_name() {
        return 'OlostepScraper'
    }

    name = 'olostep_scrape'

    description = 'Fetch and read the content of a web page from a URL.'

    private readonly apiKey: string
    private readonly Olostep: any
    private readonly Format: any

    constructor(apiKey: string, Olostep: any, Format: any, description?: string) {
        super()
        this.apiKey = apiKey
        this.Olostep = Olostep
        this.Format = Format
        if (description) this.description = description
    }

    protected async _call(url: string): Promise<string> {
        if (!url) return 'No URL provided'

        try {
            const client = new this.Olostep({ apiKey: this.apiKey })

            const result = await client.scrapes.create({
                url,
                formats: [this.Format.MARKDOWN]
            })

            return result?.markdown_content || 'No content found'
        } catch (error: any) {
            return `Olostep scrape error: ${error?.message ?? String(error)}`
        }
    }
}

class OlostepScraperMissingSDK extends Tool {
    static lc_name() {
        return 'OlostepScraperMissingSDK'
    }

    name = 'olostep_scrape'

    description = 'Fetch and read the content of a web page from a URL.'

    private readonly message: string

    constructor(message: string, description?: string) {
        super()
        this.message = message
        if (description) this.description = description
    }

    protected async _call(_url: string): Promise<string> {
        return this.message
    }
}

class OlostepScraper_Tools implements INode {
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
        this.label = 'Olostep Scraper'
        this.name = 'olostepScraper'
        this.version = 1.0
        this.type = 'OlostepScraper'
        this.icon = 'olostep.svg'
        this.category = 'Tools'
        this.description = 'Fetch and extract clean Markdown content from any URL using Olostep'
        this.inputs = [
            {
                name: 'description',
                label: 'Tool Description',
                type: 'string',
                rows: 4,
                optional: true,
                additionalParams: true,
                default: 'Fetch and read the content of a web page from a URL.'
            }
        ]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['olostepApi']
        }
        this.baseClasses = [this.type, ...getBaseClasses(OlostepScraper)]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('apiKey', credentialData, nodeData)

        const description = nodeData.inputs?.description as string

        try {
            const olostepMod: any = await import('olostep')
            const Olostep = olostepMod?.default
            const Format = olostepMod?.Format
            if (!Olostep || !Format) {
                return new OlostepScraperMissingSDK('Olostep SDK is unavailable', description)
            }
            return new OlostepScraper(String(apiKey), Olostep, Format, description)
        } catch (error: any) {
            return new OlostepScraperMissingSDK(`Olostep SDK is not installed: ${error?.message ?? String(error)}`, description)
        }
    }
}

module.exports = { nodeClass: OlostepScraper_Tools }
