import { omit } from 'lodash'
import { ICommonObject, IDocument, INode, INodeData, INodeParams, INodeOptionsValue } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import {
    convertMultiOptionsToStringArray,
    getCredentialData,
    getCredentialParam,
    handleEscapeCharacters,
    INodeOutputsValue,
    refreshOAuth2Token
} from '../../../src'
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx'
import { CSVLoader } from '@langchain/community/document_loaders/fs/csv'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { LoadOfSheet } from '../MicrosoftExcel/ExcelLoader'
import { PowerpointLoader } from '../MicrosoftPowerpoint/PowerpointLoader'
// @ts-ignore
import { google, drive_v3 } from 'googleapis'

// Helper function to get human-readable MIME type labels
const getMimeTypeLabel = (mimeType: string): string | undefined => {
    const mimeTypeLabels: { [key: string]: string } = {
        'application/vnd.google-apps.document': 'Google Doc',
        'application/vnd.google-apps.spreadsheet': 'Google Sheet',
        'application/vnd.google-apps.presentation': 'Google Slides',
        'application/pdf': 'PDF',
        'text/plain': 'Text File',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Doc',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel File'
    }
    return mimeTypeLabels[mimeType] || undefined
}

class GoogleDrive_DocumentLoaders implements INode {
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
        this.label = 'Google Drive'
        this.name = 'googleDrive'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'google-drive.svg'
        this.category = 'Document Loaders'
        this.description = `Load documents from Google Drive files`
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            description: 'Google Drive OAuth2 or Service Account Credential',
            credentialNames: ['googleDriveOAuth2', 'googleVertexAuth']
        }
        this.inputs = [
            {
                label: 'Select Files',
                name: 'selectedFiles',
                type: 'asyncMultiOptions',
                loadMethod: 'listFiles',
                description: 'Select files from your Google Drive',
                refresh: true,
                optional: true
            },
            {
                label: 'Include Shared Drives',
                name: 'includeSharedDrives',
                type: 'boolean',
                description:
                    'Whether to include files from shared drives (Team Drives) that you have access to. Automatically enabled and required when using service account credentials.',
                default: false,
                optional: true
            },
            {
                label: 'Shared Drive ID',
                name: 'sharedDriveId',
                type: 'string',
                description: 'Google Drive shared drive (Team Drive) ID. Required when using service account credentials.',
                placeholder: '0AKxxxxxxxxxxxxxxxxx',
                optional: true,
                show: {
                    includeSharedDrives: true
                }
            },
            {
                label: 'Folder ID',
                name: 'folderId',
                type: 'string',
                description:
                    'Google Drive folder ID to load all files from (alternative to selecting specific files). Required when using service account credentials.',
                placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
                optional: true
            },
            {
                label: 'File Types',
                name: 'fileTypes',
                type: 'multiOptions',
                description: 'Types of files to load',
                options: [
                    {
                        label: 'Google Docs',
                        name: 'application/vnd.google-apps.document'
                    },
                    {
                        label: 'Google Sheets',
                        name: 'application/vnd.google-apps.spreadsheet'
                    },
                    {
                        label: 'Google Slides',
                        name: 'application/vnd.google-apps.presentation'
                    },
                    {
                        label: 'PDF Files',
                        name: 'application/pdf'
                    },
                    {
                        label: 'Text Files',
                        name: 'text/plain'
                    },
                    {
                        label: 'Word Documents',
                        name: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    },
                    {
                        label: 'PowerPoint',
                        name: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
                    },
                    {
                        label: 'Excel Files',
                        name: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    }
                ],
                default: [
                    'application/vnd.google-apps.document',
                    'application/vnd.google-apps.spreadsheet',
                    'application/vnd.google-apps.presentation',
                    'text/plain',
                    'application/pdf',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                ],
                optional: true
            },
            {
                label: 'Include Subfolders',
                name: 'includeSubfolders',
                type: 'boolean',
                description: 'Whether to include files from subfolders when loading from a folder',
                default: false,
                optional: true
            },
            {
                label: 'Max Files',
                name: 'maxFiles',
                type: 'number',
                description: 'Maximum number of files to load (default: 50)',
                default: 50,
                optional: true
            },
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
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

    private async getAuthMethod(credentialData: ICommonObject): Promise<'oauth2' | 'serviceAccount'> {
        if (credentialData.access_token) {
            return 'oauth2'
        }
        if (credentialData.googleApplicationCredential || credentialData.googleApplicationCredentialFilePath) {
            return 'serviceAccount'
        }
        throw new Error(
            'Unable to determine authentication method. Please ensure you have either OAuth2 credentials (access_token) or service account credentials (googleApplicationCredential or googleApplicationCredentialFilePath)'
        )
    }

    private async getServiceAccountDriveClient(
        credentialData: ICommonObject,
        nodeData: INodeData | undefined = undefined
    ): Promise<drive_v3.Drive> {
        const googleApplicationCredentialFilePath = getCredentialParam(
            'googleApplicationCredentialFilePath',
            credentialData,
            nodeData || ({} as INodeData)
        )
        const googleApplicationCredential = getCredentialParam('googleApplicationCredential', credentialData, nodeData || ({} as INodeData))

        if (!googleApplicationCredentialFilePath && !googleApplicationCredential) {
            throw new Error('Please specify your Google Application Credential (either file path or JSON object)')
        }

        if (googleApplicationCredentialFilePath && googleApplicationCredential) {
            throw new Error(
                'Error: More than one component has been inputted. Please use only one of the following: Google Application Credential File Path or Google Credential JSON Object'
            )
        }

        const authOptions: any = {}
        if (googleApplicationCredentialFilePath && !googleApplicationCredential) {
            authOptions.keyFile = googleApplicationCredentialFilePath
        } else if (!googleApplicationCredentialFilePath && googleApplicationCredential) {
            authOptions.credentials = JSON.parse(googleApplicationCredential)
        }

        const projectID = getCredentialParam('projectID', credentialData, nodeData || ({} as INodeData))
        if (projectID) {
            authOptions.projectId = projectID
        }

        const auth = new google.auth.GoogleAuth({
            ...authOptions,
            scopes: ['https://www.googleapis.com/auth/drive.readonly']
        })

        return google.drive({ version: 'v3', auth })
    }

    //@ts-ignore
    loadMethods = {
        async listFiles(nodeData: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const returnData: INodeOptionsValue[] = []

            try {
                let credentialData = await getCredentialData(nodeData.credential ?? '', options)
                // @ts-ignore - accessing private method from loadMethods
                const authMethod = await this.getAuthMethod(credentialData)

                // Get file types from input to filter
                const fileTypes = convertMultiOptionsToStringArray(nodeData.inputs?.fileTypes)
                const includeSharedDrives = nodeData.inputs?.includeSharedDrives as boolean
                const maxFiles = (nodeData.inputs?.maxFiles as number) || 100
                const sharedDriveId = nodeData.inputs?.sharedDriveId as string
                const folderId = nodeData.inputs?.folderId as string

                let query = 'trashed = false'

                // Add file type filter if specified
                if (fileTypes && fileTypes.length > 0) {
                    const mimeTypeQuery = fileTypes.map((type) => `mimeType='${type}'`).join(' or ')
                    query += ` and (${mimeTypeQuery})`
                }

                let files: any[] = []

                if (authMethod === 'oauth2') {
                    // OAuth2 path
                    credentialData = await refreshOAuth2Token(nodeData.credential ?? '', credentialData, options)
                    const accessToken = getCredentialParam('access_token', credentialData, nodeData)

                    if (!accessToken) {
                        return returnData
                    }

                    const url = new URL('https://www.googleapis.com/drive/v3/files')
                    url.searchParams.append('q', query)
                    url.searchParams.append('pageSize', Math.min(maxFiles, 1000).toString())
                    url.searchParams.append('fields', 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, driveId)')
                    url.searchParams.append('orderBy', 'modifiedTime desc')

                    // Add shared drives support if requested
                    if (includeSharedDrives) {
                        url.searchParams.append('supportsAllDrives', 'true')
                        url.searchParams.append('includeItemsFromAllDrives', 'true')
                    }

                    const response = await fetch(url.toString(), {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    })

                    if (!response.ok) {
                        console.error(`Failed to list files: ${response.statusText}`)
                        return returnData
                    }

                    const data = await response.json()
                    files = data.files || []
                } else {
                    // Service account path
                    if (!sharedDriveId || !folderId) {
                        console.error('Shared Drive ID and Folder ID are required when using service account credentials')
                        return returnData
                    }

                    // @ts-ignore - accessing private method from loadMethods
                    const drive = await this.getServiceAccountDriveClient(credentialData, nodeData)

                    // For service account, we list files from the specified folder in the shared drive
                    query = `'${folderId}' in parents and trashed = false`
                    if (fileTypes && fileTypes.length > 0) {
                        const mimeTypeQuery = fileTypes.map((type) => `mimeType='${type}'`).join(' or ')
                        query += ` and (${mimeTypeQuery})`
                    }

                    const response = await drive.files.list({
                        corpora: 'drive',
                        driveId: sharedDriveId,
                        includeItemsFromAllDrives: true,
                        supportsAllDrives: true,
                        q: query,
                        pageSize: Math.min(maxFiles, 1000),
                        fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, driveId)',
                        orderBy: 'modifiedTime desc'
                    })

                    files = response.data.files || []
                }

                for (const file of files) {
                    const mimeTypeLabel = getMimeTypeLabel(file.mimeType)
                    if (!mimeTypeLabel) {
                        continue
                    }

                    // Add drive context to description
                    const driveContext = file.driveId ? ' (Shared Drive)' : ' (My Drive)'

                    const obj: INodeOptionsValue = {
                        name: file.id,
                        label: file.name,
                        description: `Type: ${mimeTypeLabel}${driveContext} | Modified: ${new Date(file.modifiedTime).toLocaleDateString()}`
                    }
                    returnData.push(obj)
                }
            } catch (error) {
                console.error('Error listing Google Drive files:', error)
            }

            return returnData
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const selectedFiles = nodeData.inputs?.selectedFiles as string
        const folderId = nodeData.inputs?.folderId as string
        const sharedDriveId = nodeData.inputs?.sharedDriveId as string
        const fileTypes = nodeData.inputs?.fileTypes as string[]
        const includeSubfolders = nodeData.inputs?.includeSubfolders as boolean
        let includeSharedDrives = nodeData.inputs?.includeSharedDrives as boolean
        const maxFiles = (nodeData.inputs?.maxFiles as number) || 50
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const metadata = nodeData.inputs?.metadata
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string
        const output = nodeData.outputs?.output as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        // Get credential data and determine auth method
        let credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const authMethod = await this.getAuthMethod(credentialData)

        // For service account, automatically enable includeSharedDrives if not already set
        if (authMethod === 'serviceAccount') {
            includeSharedDrives = true
        }

        // Validate required fields based on auth method
        if (authMethod === 'serviceAccount') {
            if (!sharedDriveId) {
                throw new Error('Shared Drive ID is required when using service account credentials')
            }
            if (!folderId) {
                throw new Error('Folder ID is required when using service account credentials')
            }
        } else {
            // OAuth2 validation
            if (!selectedFiles && !folderId) {
                throw new Error('Either selected files or Folder ID is required')
            }
        }

        // Get authentication based on method
        let accessToken: string | undefined
        let driveClient: drive_v3.Drive | undefined

        if (authMethod === 'oauth2') {
            credentialData = await refreshOAuth2Token(nodeData.credential ?? '', credentialData, options)
            accessToken = getCredentialParam('access_token', credentialData, nodeData)
            if (!accessToken) {
                throw new Error('No access token found in credential')
            }
        } else {
            driveClient = await this.getServiceAccountDriveClient(credentialData, nodeData)
        }

        let docs: IDocument[] = []

        try {
            let filesToProcess: any[] = []

            if (selectedFiles && authMethod === 'oauth2') {
                // Load selected files (OAuth2 only - selectedFiles not supported for service account)
                let ids: string[] = []
                if (typeof selectedFiles === 'string' && selectedFiles.startsWith('[') && selectedFiles.endsWith(']')) {
                    ids = convertMultiOptionsToStringArray(selectedFiles)
                } else if (typeof selectedFiles === 'string') {
                    ids = [selectedFiles]
                } else if (Array.isArray(selectedFiles)) {
                    ids = selectedFiles
                }
                for (const id of ids) {
                    const fileInfo = await this.getFileInfo(id, accessToken!, includeSharedDrives, authMethod, driveClient)
                    if (fileInfo && this.shouldProcessFile(fileInfo, fileTypes)) {
                        filesToProcess.push(fileInfo)
                    }
                }
            } else if (folderId) {
                // Load files from folder
                filesToProcess = await this.getFilesFromFolder(
                    folderId,
                    accessToken,
                    fileTypes,
                    includeSubfolders,
                    includeSharedDrives,
                    maxFiles,
                    authMethod,
                    driveClient,
                    sharedDriveId
                )
            }

            // Process each file
            for (const fileInfo of filesToProcess) {
                try {
                    const doc = await this.processFile(fileInfo, accessToken, authMethod, driveClient)
                    if (doc.length > 0) {
                        docs.push(...doc)
                    }
                } catch (error) {
                    console.warn(`Failed to process file ${fileInfo.name}: ${error.message}`)
                }
            }

            // Apply text splitter if provided
            if (textSplitter && docs.length > 0) {
                docs = await textSplitter.splitDocuments(docs)
            }

            // Apply metadata transformations
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
        } catch (error) {
            throw new Error(`Failed to load Google Drive documents: ${error.message}`)
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

    private async getFileInfo(
        fileId: string,
        accessToken: string | undefined,
        includeSharedDrives: boolean,
        authMethod: 'oauth2' | 'serviceAccount',
        driveClient?: drive_v3.Drive
    ): Promise<any> {
        if (authMethod === 'oauth2' && accessToken) {
            const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`)
            url.searchParams.append('fields', 'id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, driveId')

            // Add shared drives support if requested
            if (includeSharedDrives) {
                url.searchParams.append('supportsAllDrives', 'true')
            }

            const response = await fetch(url.toString(), {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            })

            if (!response.ok) {
                throw new Error(`Failed to get file info: ${response.statusText}`)
            }

            const fileInfo = await response.json()

            // Add drive context to description
            const driveContext = fileInfo.driveId ? ' (Shared Drive)' : ' (My Drive)'

            return {
                ...fileInfo,
                driveContext
            }
        } else if (authMethod === 'serviceAccount' && driveClient) {
            const response = await driveClient.files.get({
                fileId: fileId,
                supportsAllDrives: true,
                fields: 'id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, driveId'
            })

            if (!response.data) {
                throw new Error('Failed to get file info: No data returned')
            }

            const fileInfo = response.data

            // Add drive context to description
            const driveContext = fileInfo.driveId ? ' (Shared Drive)' : ' (My Drive)'

            return {
                ...fileInfo,
                driveContext
            }
        } else {
            throw new Error('Invalid authentication method or missing credentials')
        }
    }

    private async getFilesFromFolder(
        folderId: string,
        accessToken: string | undefined,
        fileTypes: string[] | undefined,
        includeSubfolders: boolean,
        includeSharedDrives: boolean,
        maxFiles: number,
        authMethod: 'oauth2' | 'serviceAccount',
        driveClient?: drive_v3.Drive,
        sharedDriveId?: string
    ): Promise<any[]> {
        const files: any[] = []
        let nextPageToken: string | undefined

        do {
            let query = `'${folderId}' in parents and trashed = false`

            // Add file type filter if specified
            if (fileTypes && fileTypes.length > 0) {
                const mimeTypeQuery = fileTypes.map((type) => `mimeType='${type}'`).join(' or ')
                query += ` and (${mimeTypeQuery})`
            }

            let data: any

            if (authMethod === 'oauth2' && accessToken) {
                const url = new URL('https://www.googleapis.com/drive/v3/files')
                url.searchParams.append('q', query)
                url.searchParams.append('pageSize', Math.min(maxFiles - files.length, 1000).toString())
                url.searchParams.append(
                    'fields',
                    'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, driveId)'
                )

                // Add shared drives support if requested
                if (includeSharedDrives) {
                    url.searchParams.append('supportsAllDrives', 'true')
                    url.searchParams.append('includeItemsFromAllDrives', 'true')
                }

                if (nextPageToken) {
                    url.searchParams.append('pageToken', nextPageToken)
                }

                const response = await fetch(url.toString(), {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                })

                if (!response.ok) {
                    throw new Error(`Failed to list files: ${response.statusText}`)
                }

                data = await response.json()
            } else if (authMethod === 'serviceAccount' && driveClient && sharedDriveId) {
                const response = await driveClient.files.list({
                    corpora: 'drive',
                    driveId: sharedDriveId,
                    includeItemsFromAllDrives: true,
                    supportsAllDrives: true,
                    q: query,
                    pageSize: Math.min(maxFiles - files.length, 1000),
                    pageToken: nextPageToken,
                    fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, driveId)'
                })

                data = {
                    files: response.data.files || [],
                    nextPageToken: response.data.nextPageToken
                }
            } else {
                throw new Error('Invalid authentication method or missing credentials')
            }

            // Add drive context to each file
            const filesWithContext = (data.files || []).map((file: any) => ({
                ...file,
                driveContext: file.driveId ? ' (Shared Drive)' : ' (My Drive)'
            }))

            files.push(...filesWithContext)
            nextPageToken = data.nextPageToken

            // If includeSubfolders is true, also get files from subfolders
            if (includeSubfolders) {
                for (const file of data.files || []) {
                    if (file.mimeType === 'application/vnd.google-apps.folder') {
                        const subfolderFiles = await this.getFilesFromFolder(
                            file.id,
                            accessToken,
                            fileTypes,
                            includeSubfolders,
                            includeSharedDrives,
                            maxFiles - files.length,
                            authMethod,
                            driveClient,
                            sharedDriveId
                        )
                        files.push(...subfolderFiles)
                    }
                }
            }
        } while (nextPageToken && files.length < maxFiles)

        return files.slice(0, maxFiles)
    }

    private shouldProcessFile(fileInfo: any, fileTypes: string[] | undefined): boolean {
        if (!fileTypes || fileTypes.length === 0) {
            return true
        }
        return fileTypes.includes(fileInfo.mimeType)
    }

    private async processFile(
        fileInfo: any,
        accessToken: string | undefined,
        authMethod: 'oauth2' | 'serviceAccount',
        driveClient?: drive_v3.Drive
    ): Promise<IDocument[]> {
        let content = ''

        try {
            // Handle different file types
            if (this.isTextBasedFile(fileInfo.mimeType)) {
                // Download regular text files
                content = await this.downloadFile(fileInfo.id, accessToken, authMethod, driveClient)

                // Create document with metadata
                return [
                    {
                        pageContent: content,
                        metadata: {
                            source: fileInfo.webViewLink || `https://drive.google.com/file/d/${fileInfo.id}/view`,
                            fileId: fileInfo.id,
                            fileName: fileInfo.name,
                            mimeType: fileInfo.mimeType,
                            size: fileInfo.size ? parseInt(fileInfo.size) : undefined,
                            createdTime: fileInfo.createdTime,
                            modifiedTime: fileInfo.modifiedTime,
                            parents: fileInfo.parents,
                            driveId: fileInfo.driveId,
                            driveContext: fileInfo.driveContext || (fileInfo.driveId ? ' (Shared Drive)' : ' (My Drive)')
                        }
                    }
                ]
            } else if (this.isSupportedBinaryFile(fileInfo.mimeType) || this.isGoogleWorkspaceFile(fileInfo.mimeType)) {
                // Process binary files and Google Workspace files using loaders
                return await this.processBinaryFile(fileInfo, accessToken, authMethod, driveClient)
            } else {
                console.warn(`Unsupported file type ${fileInfo.mimeType} for file ${fileInfo.name}`)
                return []
            }
        } catch (error) {
            console.warn(`Failed to process file ${fileInfo.name}: ${error.message}`)
            return []
        }
    }

    private isSupportedBinaryFile(mimeType: string): boolean {
        const supportedBinaryTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv'
        ]
        return supportedBinaryTypes.includes(mimeType)
    }

    private async processBinaryFile(
        fileInfo: any,
        accessToken: string | undefined,
        authMethod: 'oauth2' | 'serviceAccount',
        driveClient?: drive_v3.Drive
    ): Promise<IDocument[]> {
        let tempFilePath: string | null = null

        try {
            let buffer: Buffer
            let processedMimeType: string
            let processedFileName: string

            if (this.isGoogleWorkspaceFile(fileInfo.mimeType)) {
                // Handle Google Workspace files by exporting to appropriate format
                const exportResult = await this.exportGoogleWorkspaceFileAsBuffer(
                    fileInfo.id,
                    fileInfo.mimeType,
                    accessToken,
                    authMethod,
                    driveClient
                )
                buffer = exportResult.buffer
                processedMimeType = exportResult.mimeType
                processedFileName = exportResult.fileName
            } else {
                // Handle regular binary files
                buffer = await this.downloadBinaryFile(fileInfo.id, accessToken, authMethod, driveClient)
                processedMimeType = fileInfo.mimeType
                processedFileName = fileInfo.name
            }

            // Download file to temporary location
            tempFilePath = await this.createTempFile(buffer, processedFileName, processedMimeType)

            let docs: IDocument[] = []
            const mimeType = processedMimeType.toLowerCase()
            switch (mimeType) {
                case 'application/pdf': {
                    const pdfLoader = new PDFLoader(tempFilePath, {
                        // @ts-ignore
                        pdfjs: () => import('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js')
                    })
                    docs = await pdfLoader.load()
                    break
                }

                case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                case 'application/msword': {
                    const docxLoader = new DocxLoader(tempFilePath)
                    docs = await docxLoader.load()
                    break
                }

                case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                case 'application/vnd.ms-excel': {
                    const excelLoader = new LoadOfSheet(tempFilePath)
                    docs = await excelLoader.load()
                    break
                }
                case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
                case 'application/vnd.ms-powerpoint': {
                    const pptxLoader = new PowerpointLoader(tempFilePath)
                    docs = await pptxLoader.load()
                    break
                }
                case 'text/csv': {
                    const csvLoader = new CSVLoader(tempFilePath)
                    docs = await csvLoader.load()
                    break
                }

                default:
                    throw new Error(`Unsupported binary file type: ${mimeType}`)
            }

            // Add Google Drive metadata to each document
            if (docs.length > 0) {
                const googleDriveMetadata = {
                    source: fileInfo.webViewLink || `https://drive.google.com/file/d/${fileInfo.id}/view`,
                    fileId: fileInfo.id,
                    fileName: fileInfo.name,
                    mimeType: fileInfo.mimeType,
                    size: fileInfo.size ? parseInt(fileInfo.size) : undefined,
                    createdTime: fileInfo.createdTime,
                    modifiedTime: fileInfo.modifiedTime,
                    parents: fileInfo.parents,
                    totalPages: docs.length // Total number of pages/sheets in the file
                }

                return docs.map((doc, index) => ({
                    ...doc,
                    metadata: {
                        ...doc.metadata, // Keep original loader metadata (page numbers, etc.)
                        ...googleDriveMetadata, // Add Google Drive metadata
                        pageIndex: index, // Add page/sheet index
                        driveId: fileInfo.driveId,
                        driveContext: fileInfo.driveContext || (fileInfo.driveId ? ' (Shared Drive)' : ' (My Drive)')
                    }
                }))
            }

            return []
        } catch (error) {
            throw new Error(`Failed to process binary file: ${error.message}`)
        } finally {
            // Clean up temporary file
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath)
                } catch (e) {
                    console.warn(`Failed to delete temporary file: ${tempFilePath}`)
                }
            }
        }
    }

    private async createTempFile(buffer: Buffer, fileName: string, mimeType: string): Promise<string> {
        // Get appropriate file extension
        let extension = path.extname(fileName)
        if (!extension) {
            const extensionMap: { [key: string]: string } = {
                'application/pdf': '.pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
                'application/msword': '.doc',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
                'application/vnd.ms-excel': '.xls',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
                'application/vnd.ms-powerpoint': '.ppt',
                'text/csv': '.csv'
            }
            extension = extensionMap[mimeType] || '.tmp'
        }

        // Create temporary file
        const tempDir = os.tmpdir()
        const tempFileName = `gdrive_${Date.now()}_${Math.random().toString(36).substring(7)}${extension}`
        const tempFilePath = path.join(tempDir, tempFileName)

        fs.writeFileSync(tempFilePath, buffer as any)
        return tempFilePath
    }

    private async downloadBinaryFile(
        fileId: string,
        accessToken: string | undefined,
        authMethod: 'oauth2' | 'serviceAccount',
        driveClient?: drive_v3.Drive
    ): Promise<Buffer> {
        if (authMethod === 'oauth2' && accessToken) {
            const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            })

            if (!response.ok) {
                throw new Error(`Failed to download file: ${response.statusText}`)
            }

            const arrayBuffer = await response.arrayBuffer()
            return Buffer.from(arrayBuffer)
        } else if (authMethod === 'serviceAccount' && driveClient) {
            const response = await driveClient.files.get(
                {
                    fileId: fileId,
                    alt: 'media',
                    supportsAllDrives: true
                },
                {
                    responseType: 'stream'
                }
            )

            return new Promise<Buffer>((resolve, reject) => {
                const chunks: Buffer[] = []
                response.data.on('data', (chunk: Buffer) => chunks.push(chunk))
                response.data.on('end', () => resolve(Buffer.concat(chunks as any)))
                response.data.on('error', reject)
            })
        } else {
            throw new Error('Invalid authentication method or missing credentials')
        }
    }

    private async downloadFile(
        fileId: string,
        accessToken: string | undefined,
        authMethod: 'oauth2' | 'serviceAccount',
        driveClient?: drive_v3.Drive
    ): Promise<string> {
        if (authMethod === 'oauth2' && accessToken) {
            const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            })

            if (!response.ok) {
                throw new Error(`Failed to download file: ${response.statusText}`)
            }

            // Only call response.text() for text-based files
            const contentType = response.headers.get('content-type') || ''
            if (!contentType.startsWith('text/') && !contentType.includes('json') && !contentType.includes('xml')) {
                throw new Error(`Cannot process binary file with content-type: ${contentType}`)
            }

            return await response.text()
        } else if (authMethod === 'serviceAccount' && driveClient) {
            const response = await driveClient.files.get(
                {
                    fileId: fileId,
                    alt: 'media',
                    supportsAllDrives: true
                },
                {
                    responseType: 'stream'
                }
            )

            return new Promise<string>((resolve, reject) => {
                const chunks: Buffer[] = []
                response.data.on('data', (chunk: Buffer) => chunks.push(chunk))
                response.data.on('end', () => {
                    const buffer = Buffer.concat(chunks as any)
                    const contentType = response.headers['content-type'] || ''
                    if (!contentType.startsWith('text/') && !contentType.includes('json') && !contentType.includes('xml')) {
                        reject(new Error(`Cannot process binary file with content-type: ${contentType}`))
                        return
                    }
                    resolve(buffer.toString('utf-8'))
                })
                response.data.on('error', reject)
            })
        } else {
            throw new Error('Invalid authentication method or missing credentials')
        }
    }

    private isGoogleWorkspaceFile(mimeType: string): boolean {
        const googleWorkspaceMimeTypes = [
            'application/vnd.google-apps.document',
            'application/vnd.google-apps.spreadsheet',
            'application/vnd.google-apps.presentation',
            'application/vnd.google-apps.drawing'
        ]
        return googleWorkspaceMimeTypes.includes(mimeType)
    }

    private isTextBasedFile(mimeType: string): boolean {
        const textBasedMimeTypes = [
            'text/plain',
            'text/html',
            'text/css',
            'text/javascript',
            'text/csv',
            'text/xml',
            'application/json',
            'application/xml',
            'text/markdown',
            'text/x-markdown'
        ]
        return textBasedMimeTypes.includes(mimeType)
    }

    private async exportGoogleWorkspaceFileAsBuffer(
        fileId: string,
        mimeType: string,
        accessToken: string | undefined,
        authMethod: 'oauth2' | 'serviceAccount',
        driveClient?: drive_v3.Drive
    ): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
        // Automatic mapping of Google Workspace MIME types to export formats
        let exportMimeType: string
        let fileExtension: string

        switch (mimeType) {
            case 'application/vnd.google-apps.document':
                exportMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                fileExtension = '.docx'
                break
            case 'application/vnd.google-apps.spreadsheet':
                exportMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                fileExtension = '.xlsx'
                break
            case 'application/vnd.google-apps.presentation':
                exportMimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
                fileExtension = '.pptx'
                break
            case 'application/vnd.google-apps.drawing':
                exportMimeType = 'application/pdf'
                fileExtension = '.pdf'
                break
            default:
                // Fallback to DOCX for any other Google Workspace file
                exportMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                fileExtension = '.docx'
                break
        }

        if (authMethod === 'oauth2' && accessToken) {
            const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(
                exportMimeType
            )}`

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            })

            if (!response.ok) {
                throw new Error(`Failed to export file: ${response.statusText}`)
            }

            const arrayBuffer = await response.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)

            return {
                buffer,
                mimeType: exportMimeType,
                fileName: `exported_file${fileExtension}`
            }
        } else if (authMethod === 'serviceAccount' && driveClient) {
            const response = await driveClient.files.export(
                {
                    fileId: fileId,
                    mimeType: exportMimeType
                },
                {
                    responseType: 'stream'
                }
            )

            return new Promise<{ buffer: Buffer; mimeType: string; fileName: string }>((resolve, reject) => {
                const chunks: Buffer[] = []
                response.data.on('data', (chunk: Buffer) => chunks.push(chunk))
                response.data.on('end', () => {
                    resolve({
                        buffer: Buffer.concat(chunks as any),
                        mimeType: exportMimeType,
                        fileName: `exported_file${fileExtension}`
                    })
                })
                response.data.on('error', reject)
            })
        } else {
            throw new Error('Invalid authentication method or missing credentials')
        }
    }
}

module.exports = { nodeClass: GoogleDrive_DocumentLoaders }
