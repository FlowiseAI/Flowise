import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { BaseDocumentLoader } from 'langchain/document_loaders/base'
import { Document } from 'langchain/document'
import axios from 'axios'
import { getCredentialData, getCredentialParam } from '../../../src/utils'

class Airtable_DocumentLoaders implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs?: INodeParams[]

    constructor() {
        this.label = 'Airtable'
        this.name = 'airtable'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'airtable.svg'
        this.category = 'Document Loaders'
        this.description = `Load data from Airtable table`
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['airtableApi']
        }
        this.inputs = [
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Base Id',
                name: 'baseId',
                type: 'string',
                placeholder: 'app11RobdGoX0YNsC',
                description:
                    'If your table URL looks like: https://airtable.com/app11RobdGoX0YNsC/tblJdmvbrgizbYICO/viw9UrP77Id0CE4ee, app11RovdGoX0YNsC is the base id'
            },
            {
                label: 'Table Id',
                name: 'tableId',
                type: 'string',
                placeholder: 'tblJdmvbrgizbYICO',
                description:
                    'If your table URL looks like: https://airtable.com/app11RobdGoX0YNsC/tblJdmvbrgizbYICO/viw9UrP77Id0CE4ee, tblJdmvbrgizbYICO is the table id'
            },
            {
                label: 'Return All',
                name: 'returnAll',
                type: 'boolean',
                default: true,
                additionalParams: true,
                description: 'If all results should be returned or only up to a given limit'
            },
            {
                label: 'Limit',
                name: 'limit',
                type: 'number',
                default: 100,
                additionalParams: true,
                description: 'Number of results to return'
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
        const baseId = nodeData.inputs?.baseId as string
        const tableId = nodeData.inputs?.tableId as string
        const returnAll = nodeData.inputs?.returnAll as boolean
        const limit = nodeData.inputs?.limit as string
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const metadata = nodeData.inputs?.metadata

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const accessToken = getCredentialParam('accessToken', credentialData, nodeData)

        const airtableOptions: AirtableLoaderParams = {
            baseId,
            tableId,
            returnAll,
            accessToken,
            limit: limit ? parseInt(limit, 10) : 100
        }

        const loader = new AirtableLoader(airtableOptions)

        let docs = []

        if (textSplitter) {
            docs = await loader.loadAndSplit(textSplitter)
        } else {
            docs = await loader.load()
        }

        if (metadata) {
            const parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
            let finaldocs = []
            for (const doc of docs) {
                const newdoc = {
                    ...doc,
                    metadata: {
                        ...doc.metadata,
                        ...parsedMetadata
                    }
                }
                finaldocs.push(newdoc)
            }
            return finaldocs
        }

        return docs
    }
}

interface AirtableLoaderParams {
    baseId: string
    tableId: string
    accessToken: string
    limit?: number
    returnAll?: boolean
}

interface AirtableLoaderResponse {
    records: AirtableLoaderPage[]
    offset?: string
}

interface AirtableLoaderPage {
    id: string
    createdTime: string
    fields: ICommonObject
}

class AirtableLoader extends BaseDocumentLoader {
    public readonly baseId: string

    public readonly tableId: string

    public readonly accessToken: string

    public readonly limit: number

    public readonly returnAll: boolean

    constructor({ baseId, tableId, accessToken, limit = 100, returnAll = false }: AirtableLoaderParams) {
        super()
        this.baseId = baseId
        this.tableId = tableId
        this.accessToken = accessToken
        this.limit = limit
        this.returnAll = returnAll
    }

    public async load(): Promise<Document[]> {
        if (this.returnAll) {
            return this.loadAll()
        }
        return this.loadLimit()
    }

    protected async fetchAirtableData(url: string, params: ICommonObject): Promise<AirtableLoaderResponse> {
        try {
            const headers = {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }
            const response = await axios.get(url, { params, headers })
            return response.data
        } catch (error) {
            throw new Error(`Failed to fetch ${url} from Airtable: ${error}`)
        }
    }

    private createDocumentFromPage(page: AirtableLoaderPage): Document {
        // Generate the URL
        const pageUrl = `https://api.airtable.com/v0/${this.baseId}/${this.tableId}/${page.id}`

        // Return a langchain document
        return new Document({
            pageContent: JSON.stringify(page.fields, null, 2),
            metadata: {
                url: pageUrl
            }
        })
    }

    private async loadLimit(): Promise<Document[]> {
        const params = { maxRecords: this.limit }
        const data = await this.fetchAirtableData(`https://api.airtable.com/v0/${this.baseId}/${this.tableId}`, params)
        if (data.records.length === 0) {
            return []
        }
        return data.records.map((page) => this.createDocumentFromPage(page))
    }

    private async loadAll(): Promise<Document[]> {
        const params: ICommonObject = { pageSize: 100 }
        let data: AirtableLoaderResponse
        let returnPages: AirtableLoaderPage[] = []

        do {
            data = await this.fetchAirtableData(`https://api.airtable.com/v0/${this.baseId}/${this.tableId}`, params)
            returnPages.push.apply(returnPages, data.records)
            params.offset = data.offset
        } while (data.offset !== undefined)
        return returnPages.map((page) => this.createDocumentFromPage(page))
    }
}

module.exports = {
    nodeClass: Airtable_DocumentLoaders
}
