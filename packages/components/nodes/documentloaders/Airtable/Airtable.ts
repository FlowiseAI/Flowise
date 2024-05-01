import axios from 'axios'
import { omit } from 'lodash'
import { Document } from '@langchain/core/documents'
import { TextSplitter } from 'langchain/text_splitter'
import { BaseDocumentLoader } from 'langchain/document_loaders/base'
import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { IDocument, ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

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
        this.version = 3.0
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
                label: 'View Id',
                name: 'viewId',
                type: 'string',
                placeholder: 'viw9UrP77Id0CE4ee',
                description:
                    'If your view URL looks like: https://airtable.com/app11RobdGoX0YNsC/tblJdmvbrgizbYICO/viw9UrP77Id0CE4ee, viw9UrP77Id0CE4ee is the view id',
                optional: true
            },
            {
                label: 'Include Only Fields',
                name: 'fields',
                type: 'string',
                placeholder: 'Name, Assignee, fld1u0qUz0SoOQ9Gg, fldew39v6LBN5CjUl',
                optional: true,
                additionalParams: true,
                description:
                    'Comma-separated list of field names or IDs to include. If empty, then ALL fields are used. Use field IDs if field names contain commas.'
            },
            {
                label: 'Return All',
                name: 'returnAll',
                type: 'boolean',
                optional: true,
                default: true,
                additionalParams: true,
                description: 'If all results should be returned or only up to a given limit'
            },
            {
                label: 'Limit',
                name: 'limit',
                type: 'number',
                optional: true,
                default: 100,
                additionalParams: true,
                description: 'Number of results to return. Ignored when Return All is enabled.'
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
                    'Each document loader comes with a default set of metadata keys that are extracted from the document. You can use this field to omit some of the default metadata keys. The value should be a list of keys, seperated by comma',
                placeholder: 'key1, key2, key3.nestedKey1',
                optional: true,
                additionalParams: true
            }
        ]
    }
    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const baseId = nodeData.inputs?.baseId as string
        const tableId = nodeData.inputs?.tableId as string
        const viewId = nodeData.inputs?.viewId as string
        const fieldsInput = nodeData.inputs?.fields as string
        const fields = fieldsInput ? fieldsInput.split(',').map((field) => field.trim()) : []
        const returnAll = nodeData.inputs?.returnAll as boolean
        const limit = nodeData.inputs?.limit as string
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const metadata = nodeData.inputs?.metadata
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const accessToken = getCredentialParam('accessToken', credentialData, nodeData)

        const airtableOptions: AirtableLoaderParams = {
            baseId,
            tableId,
            viewId,
            fields,
            returnAll,
            accessToken,
            limit: limit ? parseInt(limit, 10) : 100
        }

        const loader = new AirtableLoader(airtableOptions)

        if (!baseId || !tableId) {
            throw new Error('Base ID and Table ID must be provided.')
        }

        let docs: IDocument[] = []

        if (textSplitter) {
            docs = await loader.loadAndSplit(textSplitter)
        } else {
            docs = await loader.load()
        }

        if (metadata) {
            const parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
            docs = docs.map((doc) => ({
                ...doc,
                metadata: omit(
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
                metadata: omit(
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

interface AirtableLoaderParams {
    baseId: string
    tableId: string
    accessToken: string
    viewId?: string
    fields?: string[]
    limit?: number
    returnAll?: boolean
}

interface AirtableLoaderRequest {
    maxRecords?: number
    view: string | undefined
    fields?: string[]
    offset?: string
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

    public readonly viewId?: string

    public readonly fields: string[]

    public readonly accessToken: string

    public readonly limit: number

    public readonly returnAll: boolean

    constructor({ baseId, tableId, viewId, fields = [], accessToken, limit = 100, returnAll = false }: AirtableLoaderParams) {
        super()
        this.baseId = baseId
        this.tableId = tableId
        this.viewId = viewId
        this.fields = fields
        this.accessToken = accessToken
        this.limit = limit
        this.returnAll = returnAll
    }

    public async load(): Promise<IDocument[]> {
        if (this.returnAll) {
            return this.loadAll()
        }
        return this.loadLimit()
    }

    protected async fetchAirtableData(url: string, data: AirtableLoaderRequest): Promise<AirtableLoaderResponse> {
        try {
            const headers = {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }
            const response = await axios.post(url, data, { headers })
            return response.data
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Failed to fetch ${url} from Airtable: ${error.message}, status: ${error.response?.status}`)
            } else {
                throw new Error(`Failed to fetch ${url} from Airtable: ${error}`)
            }
        }
    }

    private createDocumentFromPage(page: AirtableLoaderPage): IDocument {
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

    private async loadLimit(): Promise<IDocument[]> {
        let data: AirtableLoaderRequest = {
            maxRecords: this.limit,
            view: this.viewId
        }

        if (this.fields.length > 0) {
            data.fields = this.fields
        }

        let response: AirtableLoaderResponse
        let returnPages: AirtableLoaderPage[] = []

        // Paginate if the user specifies a limit > 100 (like 200) but not return all.
        do {
            response = await this.fetchAirtableData(`https://api.airtable.com/v0/${this.baseId}/${this.tableId}/listRecords`, data)
            returnPages.push(...response.records)
            data.offset = response.offset

            // Stop if we have fetched enough records
            if (returnPages.length >= this.limit) break
        } while (response.offset !== undefined)

        // Truncate array to the limit if necessary
        if (returnPages.length > this.limit) {
            returnPages.length = this.limit
        }

        return returnPages.map((page) => this.createDocumentFromPage(page))
    }

    private async loadAll(): Promise<IDocument[]> {
        let data: AirtableLoaderRequest = {
            view: this.viewId
        }

        if (this.fields.length > 0) {
            data.fields = this.fields
        }

        let response: AirtableLoaderResponse
        let returnPages: AirtableLoaderPage[] = []

        do {
            response = await this.fetchAirtableData(`https://api.airtable.com/v0/${this.baseId}/${this.tableId}/listRecords`, data)
            returnPages.push(...response.records)
            data.offset = response.offset
        } while (response.offset !== undefined)
        return returnPages.map((page) => this.createDocumentFromPage(page))
    }
}

module.exports = {
    nodeClass: Airtable_DocumentLoaders
}
