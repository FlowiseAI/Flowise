import { INode, INodeData, INodeParams } from '../../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { Document } from 'langchain/document'
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { CSVLoader } from '@langchain/community/document_loaders/fs/csv'
import { DriveService } from './DriveService'
import _, { omit } from 'lodash'

class GoogleDrive implements INode {
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
        this.label = 'Google Drive'
        this.name = 'googleDrive'
        this.version = 1.0
        this.type = 'GoogleDrive'
        this.icon = 'drive.svg'
        this.category = 'Document Loaders'
        this.description = 'Load documents from Google Drive'
        this.baseClasses = [this.type, 'DocumentLoader']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['googleOAuth']
        }
        this.inputs = [
            {
                label: 'Selected Files',
                name: 'selectedFiles',
                type: 'string',
                description: 'Selected file IDs from Google Drive',
                optional: false
            },
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'PDF Usage',
                name: 'pdfUsage',
                type: 'options',
                options: [
                    {
                        label: 'One document per page',
                        name: 'perPage'
                    },
                    {
                        label: 'One document per file',
                        name: 'perFile'
                    }
                ],
                default: 'perPage'
            },
            {
                label: 'CSV Column Extraction',
                name: 'columnName',
                type: 'string',
                description: 'Extract specific column from CSV files',
                placeholder: 'Enter column name',
                optional: true
            },
            {
                label: 'Additional Metadata',
                name: 'metadata',
                type: 'json',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Omit Metadata Keys',
                name: 'omitMetadataKeys',
                type: 'string',
                rows: 4,
                description: 'Comma-separated metadata keys to omit. Use * to omit all except Additional Metadata',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const metadata = nodeData.inputs?.metadata
        const selectedFiles = nodeData.inputs?.selectedFiles as string
        const pdfUsage = nodeData.inputs?.pdfUsage as string
        const columnName = nodeData.inputs?.columnName as string
        const credentialData = nodeData.credential ? JSON.parse(nodeData.credential).plainDataObj : {}
        const omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string
        const _omitMetadataKeys = omitMetadataKeys === '*' ? '*' : omitMetadataKeys.split(',')

        if (!credentialData || _.isEmpty(credentialData)) {
            throw new Error('Credentials not found')
        }

        const credentials = {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            redirectUrl: '/api/v1/auth/google/callback',
            accessToken: credentialData.googleAccessToken,
            refreshToken: credentialData.refreshToken,
            expiryDate: credentialData.expiryDate
        }

        const driveService = new DriveService(credentials)
        const fileIds = JSON.parse(selectedFiles)
        const documents: Document[] = []

        for (const fileId of fileIds) {
            const file = await driveService.getFile(fileId)
            const response = await driveService.downloadFile(fileId)

            let docs: Document[] = []

            if (file.mimeType === 'application/vnd.google-apps.document') {
                // Google Docs are returned as plain text
                docs = [new Document({ pageContent: response.data })]
            } else if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
                // CSV data needs to be parsed
                docs = await this.processCsvContent(response.data, columnName, textSplitter)
            } else if (file.mimeType === 'application/pdf') {
                const buffer = Buffer.from(response.data, 'base64')
                docs = await this.processPdfFile(buffer, pdfUsage, textSplitter)
            } else {
                docs = [new Document({ pageContent: response.data })]
            }

            // Add metadata to documents
            docs = docs.map((doc) => ({
                ...doc,
                metadata:
                    _omitMetadataKeys === '*'
                        ? { ...metadata }
                        : omit(
                              {
                                  ...doc.metadata,
                                  source: `gdrive://${file.id}`,
                                  fileId: file.id,
                                  fileName: file.name,
                                  mimeType: file.mimeType,
                                  ...metadata
                              },
                              omitMetadataKeys
                          )
            }))

            documents.push(...docs)
        }

        return documents
    }

    private async processPdfFile(buffer: Buffer, usage: string, textSplitter?: TextSplitter): Promise<Document[]> {
        const loader = new PDFLoader(new Blob([buffer]), {
            splitPages: usage !== 'perFile'
        })

        let docs = await loader.load()
        if (textSplitter) {
            docs = await textSplitter.splitDocuments(docs)
        }
        return docs
    }

    private async processCsvContent(csvContent: string, columnName?: string, textSplitter?: TextSplitter): Promise<Document[]> {
        // Convert CSV string to Blob
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const loader = new CSVLoader(blob, columnName?.trim().length ? columnName.trim() : undefined)

        let docs = await loader.load()
        if (textSplitter) {
            docs = await textSplitter.splitDocuments(docs)
        }
        return docs
    }
}

module.exports = { nodeClass: GoogleDrive }
