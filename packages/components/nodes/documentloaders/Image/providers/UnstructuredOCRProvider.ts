import { IOCRProvider, OCRProviderOptions } from './IOCRProvider'
import { UnstructuredLoader } from '../../Unstructured/Unstructured'
import { UnstructuredLoaderOptions, UnstructuredLoaderStrategy } from '@langchain/community/document_loaders/fs/unstructured'
import { getCredentialParam } from '../../../../src'

export class UnstructuredOCRProvider implements IOCRProvider {
    private apiUrl: string
    private apiKey?: string
    private strategy: UnstructuredLoaderStrategy
    private ocrLanguages: string[]

    constructor(options: OCRProviderOptions) {
        this.apiUrl = process.env.UNSTRUCTURED_API_URL || 'https://api.unstructuredapp.io/general/v0/general'
        this.apiKey = getCredentialParam('unstructuredAPIKey', options.credentialData, options.nodeData)
        this.strategy = 'ocr_only'
        this.ocrLanguages = []
    }

    async extractText(buffer: Buffer, filename: string): Promise<string> {
        const options: UnstructuredLoaderOptions = {
            apiUrl: this.apiUrl,
            strategy: this.strategy,
            ocrLanguages: this.ocrLanguages
        }

        if (this.apiKey) {
            options.apiKey = this.apiKey
        }

        const loader = new UnstructuredLoader(options)
        const documents = await loader.loadAndSplitBuffer(buffer, filename)

        return documents.map((doc) => doc.pageContent).join('\n\n')
    }
}

