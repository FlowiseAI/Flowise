/**
 * Google Drive Document Loader
 *
 * This loader integrates with Google Drive to download and process various file types:
 * - Google Workspace files (Docs, Sheets, Slides) - exported as text/CSV
 * - Microsoft Office files (Word, Excel, PowerPoint) - uses specialized LangChain loaders
 * - PDF files - uses PDFLoader with configurable page splitting
 * - Plain text and CSV files - direct text processing
 *
 * Key Features:
 * - Automatic fallback from text export to binary download for Office files
 * - Proper binary file handling with base64 encoding
 * - Individual file error handling (failures don't stop batch processing)
 * - Support for text splitting and metadata enrichment
 * - Includes clickable file URLs in metadata for easy access to original files
 *
 * Metadata Fields:
 * - source: Google Drive URI (gdrive://fileId)
 * - fileId: Google Drive file ID
 * - fileName: Original file name
 * - fileUrl: Direct link to view/edit file in Google Drive
 * - iconUrl: File type icon URL
 * - mimeType: Original file MIME type
 * - lastModified: File modification timestamp (when enabled)
 *
 * Updated: Uses proper document loaders instead of generic text processing
 */

import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { Document } from 'langchain/document'
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { CSVLoader } from '@langchain/community/document_loaders/fs/csv'
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx'
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
            // {
            //     label: 'CSV Column Extraction',
            //     name: 'columnName',
            //     type: 'string',
            //     description: 'Extract specific column from CSV files',
            //     placeholder: 'Enter column name',
            //     optional: true
            // },
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
        const selectedFiles = nodeData.inputs?.selectedFiles && JSON.parse(nodeData.inputs?.selectedFiles)
        const fileIds = selectedFiles.map((file: any) => file.fileId)
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
            redirectUrl: process.env.GOOGLE_CALLBACK_URL,
            accessToken: credentialData.googleAccessToken,
            refreshToken: credentialData.googleRefreshToken,
            expiresAt: credentialData.expiresAt
        }

        const driveService = new DriveService(credentials)
        return this.processFiles(driveService, fileIds, selectedFiles, textSplitter, pdfUsage, columnName, metadata, _omitMetadataKeys)
    }

    async syncAndRefresh(nodeData: INodeData): Promise<any> {
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const metadata = nodeData.inputs?.metadata
        const selectedFiles = nodeData.inputs?.selectedFiles && JSON.parse(nodeData.inputs?.selectedFiles)
        const fileIds = selectedFiles.map((file: any) => file.fileId)
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
            redirectUrl: process.env.GOOGLE_CALLBACK_URL,
            accessToken: credentialData.googleAccessToken,
            refreshToken: credentialData.refreshToken,
            expiryDate: credentialData.expiryDate
        }

        const driveService = new DriveService(credentials)
        return this.processFiles(
            driveService,
            fileIds,
            selectedFiles,
            textSplitter,
            pdfUsage,
            columnName,
            metadata,
            _omitMetadataKeys,
            true
        )
    }

    private async processFiles(
        driveService: DriveService,
        fileIds: string[],
        selectedFiles: any[],
        textSplitter?: TextSplitter,
        pdfUsage?: string,
        columnName?: string,
        metadata?: any,
        _omitMetadataKeys?: string | string[],
        includeModificationTime = false
    ): Promise<Document[]> {
        const documents: Document[] = []

        for (const fileId of fileIds) {
            try {
                const file = await driveService.getFile(fileId)
                const response = await driveService.downloadFile(fileId)

                let docs: Document[] = await this.processFileContent(file, response, textSplitter, pdfUsage, columnName)

                // Add metadata to documents
                const baseMetadata = {
                    source: `gdrive://${file.id}`,
                    fileId: file.id,
                    fileName: file.name,
                    fileUrl: file.webViewLink,
                    iconUrl: selectedFiles.find((f: any) => f.fileId === file.id)?.iconUrl,
                    mimeType: file.mimeType,
                    ...(includeModificationTime && { lastModified: new Date(file.modifiedTime).getTime() }),
                    ...metadata
                }

                docs = docs.map((doc) => ({
                    ...doc,
                    metadata:
                        _omitMetadataKeys === '*'
                            ? { ...metadata, ...(includeModificationTime && { lastModified: baseMetadata.lastModified }) }
                            : omit({ ...doc.metadata, ...baseMetadata }, _omitMetadataKeys as string[])
                }))

                documents.push(...docs)
            } catch (error) {
                console.error(`Error processing file ${fileId}:`, error)
                // Continue processing other files instead of failing completely
            }
        }

        return documents
    }

    private async processFileContent(
        file: any,
        response: any,
        textSplitter?: TextSplitter,
        pdfUsage?: string,
        columnName?: string
    ): Promise<Document[]> {
        const { mimeType } = file
        const { data, mimeType: responseMimeType } = response

        // Google Workspace files (already exported as text)
        if (mimeType === 'application/vnd.google-apps.document' || mimeType === 'application/vnd.google-apps.presentation') {
            return this.processPlainText(data, textSplitter)
        }

        if (mimeType === 'application/vnd.google-apps.spreadsheet') {
            return this.processCsvContent(data, columnName, textSplitter)
        }

        // PDF files
        if (mimeType === 'application/pdf') {
            return this.processPdfFile(Buffer.from(data, 'base64'), pdfUsage, textSplitter)
        }

        // Microsoft Word files
        if (this.isWordDocument(mimeType)) {
            return this.processDocxFile(data, responseMimeType, textSplitter)
        }

        // Microsoft Excel and CSV files
        if (this.isSpreadsheetFile(mimeType)) {
            return this.processExcelFile(data, responseMimeType, columnName, textSplitter)
        }

        // Microsoft PowerPoint files
        if (this.isPresentationFile(mimeType)) {
            return this.processPlainText(data, textSplitter)
        }

        // Plain text files
        if (mimeType === 'text/plain') {
            return this.processPlainText(data, textSplitter)
        }

        // Default fallback
        return this.processPlainText(data, textSplitter)
    }

    private isWordDocument(mimeType: string): boolean {
        return ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'].includes(mimeType)
    }

    private isSpreadsheetFile(mimeType: string): boolean {
        return [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv',
            'application/csv'
        ].includes(mimeType)
    }

    private isPresentationFile(mimeType: string): boolean {
        return ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint'].includes(
            mimeType
        )
    }

    private async processPlainText(data: string, textSplitter?: TextSplitter): Promise<Document[]> {
        let docs = [new Document({ pageContent: data })]
        if (textSplitter) {
            docs = await textSplitter.splitDocuments(docs)
        }
        return docs
    }

    private async processPdfFile(buffer: Buffer, usage: string = 'perPage', textSplitter?: TextSplitter): Promise<Document[]> {
        const loader = new PDFLoader(new Blob([buffer]), {
            splitPages: usage !== 'perFile'
        })

        let docs = await loader.load()
        if (textSplitter) {
            docs = await textSplitter.splitDocuments(docs)
        }
        return docs
    }

    private async processDocxFile(data: string, dataMimeType: string, textSplitter?: TextSplitter): Promise<Document[]> {
        // If the data is plain text (successfully exported from Google Drive), use it directly
        if (dataMimeType === 'text/plain') {
            return this.processPlainText(data, textSplitter)
        }

        // Otherwise, treat as binary data and use DocxLoader
        const buffer = Buffer.from(data, 'base64')
        const blob = new Blob([buffer])
        const loader = new DocxLoader(blob)

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

    private async processExcelFile(
        data: string,
        dataMimeType: string,
        columnName?: string,
        textSplitter?: TextSplitter
    ): Promise<Document[]> {
        // If the data is CSV text (successfully exported from Google Drive), use it directly
        if (dataMimeType === 'text/csv') {
            return this.processCsvContent(data, columnName, textSplitter)
        }

        // Otherwise, treat as binary data and use CSVLoader with the binary data
        const buffer = Buffer.from(data, 'base64')
        const blob = new Blob([buffer])
        const loader = new CSVLoader(blob, columnName?.trim().length ? columnName.trim() : undefined)

        let docs = await loader.load()
        if (textSplitter) {
            docs = await textSplitter.splitDocuments(docs)
        }
        return docs
    }
}

module.exports = { nodeClass: GoogleDrive }
