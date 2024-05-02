import {
    HiResModelName,
    SkipInferTableTypes,
    UnstructuredLoaderOptions,
    UnstructuredLoaderStrategy
} from 'langchain/document_loaders/fs/unstructured'
import { BaseDocumentLoader } from 'langchain/document_loaders/base'
import { StringWithAutocomplete } from 'langchain/dist/util/types'
import { Document } from '@langchain/core/documents'

/**
 * Set the chunking_strategy to chunk text into larger or smaller elements. Defaults to None with optional arg of by_title
 */
type ChunkingStrategy = 'None' | 'by_title'

/**
 * Represents an element returned by the Unstructured API. It has
 * properties for the element type, text content, and metadata.
 */
type Element = {
    type: string
    text: string
    // this is purposefully loosely typed
    metadata: {
        [key: string]: unknown
    }
}

export class UnstructuredLoader extends BaseDocumentLoader {
    public filePath: string

    private apiUrl = 'https://api.unstructured.io/general/v0/general'

    private apiKey?: string

    private strategy: StringWithAutocomplete<UnstructuredLoaderStrategy> = 'hi_res'

    private encoding?: string

    private ocrLanguages: Array<string> = []

    private coordinates?: boolean

    private pdfInferTableStructure?: boolean

    private xmlKeepTags?: boolean

    private skipInferTableTypes?: Array<StringWithAutocomplete<SkipInferTableTypes>>

    private hiResModelName?: StringWithAutocomplete<HiResModelName>

    private includePageBreaks?: boolean

    private chunkingStrategy?: StringWithAutocomplete<ChunkingStrategy>

    private multiPageSections?: boolean

    private combineUnderNChars?: number

    private newAfterNChars?: number

    private maxCharacters?: number

    constructor(optionsOrLegacyFilePath: UnstructuredLoaderOptions) {
        super()

        const options = optionsOrLegacyFilePath
        this.apiKey = options.apiKey
        this.apiUrl = options.apiUrl ?? this.apiUrl
        this.strategy = options.strategy ?? this.strategy
        this.encoding = options.encoding
        this.ocrLanguages = options.ocrLanguages ?? this.ocrLanguages
        this.coordinates = options.coordinates
        this.pdfInferTableStructure = options.pdfInferTableStructure
        this.xmlKeepTags = options.xmlKeepTags
        this.skipInferTableTypes = options.skipInferTableTypes
        this.hiResModelName = options.hiResModelName
        this.includePageBreaks = options.includePageBreaks
        this.chunkingStrategy = options.chunkingStrategy
        this.multiPageSections = options.multiPageSections
        this.combineUnderNChars = options.combineUnderNChars
        this.newAfterNChars = options.newAfterNChars
        this.maxCharacters = options.maxCharacters
    }

    async _partition(buffer: Buffer, fileName: string): Promise<Element[]> {
        const formData = new FormData()
        formData.append('files', new Blob([buffer]), fileName)
        formData.append('strategy', this.strategy)
        this.ocrLanguages.forEach((language) => {
            formData.append('ocr_languages', language)
        })
        if (this.encoding) {
            formData.append('encoding', this.encoding)
        }
        if (this.coordinates === true) {
            formData.append('coordinates', 'true')
        }
        if (this.pdfInferTableStructure === true) {
            formData.append('pdf_infer_table_structure', 'true')
        }
        if (this.xmlKeepTags === true) {
            formData.append('xml_keep_tags', 'true')
        }
        if (this.skipInferTableTypes) {
            formData.append('skip_infer_table_types', JSON.stringify(this.skipInferTableTypes))
        }
        if (this.hiResModelName) {
            formData.append('hi_res_model_name', this.hiResModelName)
        }
        if (this.includePageBreaks) {
            formData.append('include_page_breaks', 'true')
        }
        if (this.chunkingStrategy) {
            formData.append('chunking_strategy', this.chunkingStrategy)
        }
        if (this.multiPageSections !== undefined) {
            formData.append('multipage_sections', this.multiPageSections ? 'true' : 'false')
        }
        if (this.combineUnderNChars !== undefined) {
            formData.append('combine_under_n_chars', String(this.combineUnderNChars))
        }
        if (this.newAfterNChars !== undefined) {
            formData.append('new_after_n_chars', String(this.newAfterNChars))
        }
        if (this.maxCharacters !== undefined) {
            formData.append('max_characters', String(this.maxCharacters))
        }

        const headers = {
            'UNSTRUCTURED-API-KEY': this.apiKey ?? ''
        }

        const response = await fetch(this.apiUrl, {
            method: 'POST',
            body: formData,
            headers
        })

        if (!response.ok) {
            throw new Error(`Failed to partition file ${this.filePath} with error ${response.status} and message ${await response.text()}`)
        }

        const elements = await response.json()
        if (!Array.isArray(elements)) {
            throw new Error(`Expected partitioning request to return an array, but got ${elements}`)
        }
        return elements.filter((el) => typeof el.text === 'string') as Element[]
    }

    async loadAndSplitBuffer(buffer: Buffer, fileName: string): Promise<Document[]> {
        const elements = await this._partition(buffer, fileName)

        const documents: Document[] = []
        for (const element of elements) {
            const { metadata, text } = element
            if (typeof text === 'string') {
                documents.push(
                    new Document({
                        pageContent: text,
                        metadata: {
                            ...metadata,
                            category: element.type
                        }
                    })
                )
            }
        }

        return documents
    }

    async load(): Promise<Document[]> {
        return Promise.reject(new Error('load() is not supported for UnstructuredLoader. Use loadAndSplitBuffer() instead.'))
    }
}
