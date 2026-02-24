import { BlobServiceClient, ContainerClient, StorageSharedKeyCredential } from '@azure/storage-blob'
import multer from 'multer'
import { MulterAzureStorage } from 'multer-azure-blob-storage'
import { v4 as uuidv4 } from 'uuid'
import { BaseStorageProvider } from './BaseStorageProvider'
import { FileInfo, StorageResult, StorageSizeResult } from './IStorageProvider'

const { WinstonAzureBlob } = require('winston-azure-blob')

/**
 * Extends MulterAzureStorage to set file.path from file.blobName after upload.
 * The server expects file.path (local/GCS) or file.key (S3) but multer-azure-blob-storage
 * only sets file.blobName. This subclass bridges that gap.
 */
class MulterAzureStorageWithPath extends MulterAzureStorage {
    _handleFile(req: any, file: any, cb: (error?: any, info?: any) => void): Promise<void> {
        return super._handleFile(req, file, (err: any, info: any) => {
            if (!err && info) {
                info.path = info.blobName
            }
            cb(err, info)
        })
    }
}

export class AzureBlobStorageProvider extends BaseStorageProvider {
    private containerClient: ContainerClient
    private containerName: string

    constructor() {
        super()
        const config = this.initAzureConfig()
        this.containerClient = config.containerClient
        this.containerName = config.containerName
    }

    private initAzureConfig(): {
        containerClient: ContainerClient
        containerName: string
    } {
        const connectionString = process.env.AZURE_BLOB_STORAGE_CONNECTION_STRING
        const accountName = process.env.AZURE_BLOB_STORAGE_ACCOUNT_NAME
        const accountKey = process.env.AZURE_BLOB_STORAGE_ACCOUNT_KEY
        const containerName = process.env.AZURE_BLOB_STORAGE_CONTAINER_NAME

        if (!containerName || containerName.trim() === '') {
            throw new Error('AZURE_BLOB_STORAGE_CONTAINER_NAME env variable is required')
        }

        let blobServiceClient: BlobServiceClient

        // Authenticate either using connection string or account name and key
        if (connectionString && connectionString.trim() !== '') {
            blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
        } else if (accountName && accountName.trim() !== '' && accountKey && accountKey.trim() !== '') {
            const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey)
            blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, sharedKeyCredential)
        } else {
            throw new Error(
                'Azure Blob Storage configuration is missing. Provide AZURE_BLOB_STORAGE_CONNECTION_STRING or AZURE_BLOB_STORAGE_ACCOUNT_NAME + AZURE_BLOB_STORAGE_ACCOUNT_KEY'
            )
        }

        const containerClient = blobServiceClient.getContainerClient(containerName)
        return { containerClient, containerName }
    }

    getStorageType(): string {
        return 'azure'
    }

    getConfig(): any {
        return {
            containerName: this.containerName
        }
    }

    async addBase64FilesToStorage(fileBase64: string, chatflowid: string, fileNames: string[], orgId: string): Promise<StorageResult> {
        // Validate chatflowid
        this.validateChatflowId(chatflowid)
        this.validatePathSecurity(chatflowid)

        const splitDataURI = fileBase64.split(',')
        const filename = splitDataURI.pop()?.split(':')[1] ?? ''
        const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
        const mime = splitDataURI[0].split(':')[1].split(';')[0]

        const sanitizedFilename = this.sanitizeFilename(filename)
        const blobName = `${orgId}/${chatflowid}/${sanitizedFilename}`

        const blockBlobClient = this.containerClient.getBlockBlobClient(blobName)
        await blockBlobClient.upload(bf, bf.length, {
            blobHTTPHeaders: { blobContentType: mime }
        })

        fileNames.push(sanitizedFilename)
        const totalSize = await this.getStorageSize(orgId)

        return { path: 'FILE-STORAGE::' + JSON.stringify(fileNames), totalSize: totalSize / 1024 / 1024 }
    }

    async addArrayFilesToStorage(
        mime: string,
        bf: Buffer,
        fileName: string,
        fileNames: string[],
        ...paths: string[]
    ): Promise<StorageResult> {
        const sanitizedFilename = this.sanitizeFilename(fileName)

        let blobName = paths.reduce((acc, cur) => acc + '/' + cur, '') + '/' + sanitizedFilename
        if (blobName.startsWith('/')) {
            blobName = blobName.substring(1)
        }

        const blockBlobClient = this.containerClient.getBlockBlobClient(blobName)
        await blockBlobClient.upload(bf, bf.length, {
            blobHTTPHeaders: { blobContentType: mime }
        })
        fileNames.push(sanitizedFilename)

        const totalSize = await this.getStorageSize(paths[0])

        return { path: 'FILE-STORAGE::' + JSON.stringify(fileNames), totalSize: totalSize / 1024 / 1024 }
    }

    async addSingleFileToStorage(mime: string, bf: Buffer, fileName: string, ...paths: string[]): Promise<StorageResult> {
        const sanitizedFilename = this.sanitizeFilename(fileName)

        let blobName = paths.reduce((acc, cur) => acc + '/' + cur, '') + '/' + sanitizedFilename
        if (blobName.startsWith('/')) {
            blobName = blobName.substring(1)
        }

        const blockBlobClient = this.containerClient.getBlockBlobClient(blobName)
        await blockBlobClient.upload(bf, bf.length, {
            blobHTTPHeaders: { blobContentType: mime }
        })

        const totalSize = await this.getStorageSize(paths[0])

        return { path: 'FILE-STORAGE::' + sanitizedFilename, totalSize: totalSize / 1024 / 1024 }
    }

    async getFileFromUpload(filePath: string): Promise<Buffer> {
        let blobName = filePath
        // remove the first '/' if it exists
        if (blobName.startsWith('/')) {
            blobName = blobName.substring(1)
        }

        const blockBlobClient = this.containerClient.getBlockBlobClient(blobName)
        const downloadResponse = await blockBlobClient.downloadToBuffer()
        return downloadResponse
    }

    async getFileFromStorage(file: string, ...paths: string[]): Promise<Buffer> {
        const sanitizedFilename = this.sanitizeFilename(file)

        let blobName = paths.reduce((acc, cur) => acc + '/' + cur, '') + '/' + sanitizedFilename
        if (blobName.startsWith('/')) {
            blobName = blobName.substring(1)
        }

        const blockBlobClient = this.containerClient.getBlockBlobClient(blobName)
        const buffer = await blockBlobClient.downloadToBuffer()
        return buffer
    }

    async streamStorageFile(chatflowId: string, chatId: string, fileName: string, orgId: string): Promise<Buffer | undefined> {
        // Validate chatflowId and chatId
        this.validateChatflowId(chatflowId)
        this.validatePathSecurity(chatflowId, chatId)

        const sanitizedFilename = this.sanitizeFilename(fileName)
        const blobName = `${orgId}/${chatflowId}/${chatId}/${sanitizedFilename}`

        const blockBlobClient = this.containerClient.getBlockBlobClient(blobName)
        const buffer = await blockBlobClient.downloadToBuffer()
        return buffer
    }

    async getFilesListFromStorage(...paths: string[]): Promise<FileInfo[]> {
        let prefix = paths.reduce((acc, cur) => acc + '/' + cur, '')
        if (prefix.startsWith('/')) {
            prefix = prefix.substring(1)
        }

        const filesList: FileInfo[] = []
        for await (const blob of this.containerClient.listBlobsFlat({ prefix })) {
            filesList.push({
                name: blob.name.split('/').pop() || '',
                path: blob.name,
                size: blob.properties.contentLength || 0
            })
        }
        return filesList
    }

    async removeFilesFromStorage(...paths: string[]): Promise<StorageSizeResult> {
        let prefix = paths.reduce((acc, cur) => acc + '/' + cur, '')
        if (prefix.startsWith('/')) {
            prefix = prefix.substring(1)
        }

        // Delete all blobs with the prefix
        for await (const blob of this.containerClient.listBlobsFlat({ prefix })) {
            await this.containerClient.deleteBlob(blob.name)
        }

        const totalSize = await this.getStorageSize(paths[0])
        return { totalSize: totalSize / 1024 / 1024 }
    }

    async removeSpecificFileFromUpload(filePath: string): Promise<void> {
        let blobName = filePath
        if (blobName.startsWith('/')) {
            blobName = blobName.substring(1)
        }

        await this.containerClient.deleteBlob(blobName)
    }

    async removeSpecificFileFromStorage(...paths: string[]): Promise<StorageSizeResult> {
        let blobName = paths.reduce((acc, cur) => acc + '/' + cur, '')
        if (blobName.startsWith('/')) {
            blobName = blobName.substring(1)
        }

        const blockBlobClient = this.containerClient.getBlockBlobClient(blobName)
        if (await blockBlobClient.exists()) {
            await blockBlobClient.delete()
        }

        const totalSize = await this.getStorageSize(paths[0])
        return { totalSize: totalSize / 1024 / 1024 }
    }

    async removeFolderFromStorage(...paths: string[]): Promise<StorageSizeResult> {
        let prefix = paths.reduce((acc, cur) => acc + '/' + cur, '')
        if (prefix.startsWith('/')) {
            prefix = prefix.substring(1)
        }

        // Delete all blobs with the prefix
        for await (const blob of this.containerClient.listBlobsFlat({ prefix })) {
            await this.containerClient.deleteBlob(blob.name)
        }

        const totalSize = await this.getStorageSize(paths[0])
        return { totalSize: totalSize / 1024 / 1024 }
    }

    async getStorageSize(orgId: string): Promise<number> {
        if (!orgId) return 0

        let totalSize = 0
        for await (const blob of this.containerClient.listBlobsFlat({ prefix: orgId })) {
            totalSize += blob.properties.contentLength || 0
        }

        return totalSize
    }

    getMulterStorage(): multer.Multer {
        const connectionString = process.env.AZURE_BLOB_STORAGE_CONNECTION_STRING

        let storageConfig: any = {
            containerName: this.containerName,
            blobName: async (_req: any, file: any) => `uploads/${uuidv4()}/${file.originalname}`
        }

        // Use connection string if available, otherwise use account name/key
        if (connectionString && connectionString.trim() !== '') {
            storageConfig.connectionString = connectionString
        } else {
            storageConfig.accountName = process.env.AZURE_BLOB_STORAGE_ACCOUNT_NAME
            storageConfig.accessKey = process.env.AZURE_BLOB_STORAGE_ACCOUNT_KEY
        }

        const azureStorage = new MulterAzureStorageWithPath(storageConfig)
        return multer({ storage: azureStorage })
    }

    getLoggerTransports(logType: 'server' | 'error' | 'requests'): any[] {
        const connectionString = process.env.AZURE_BLOB_STORAGE_CONNECTION_STRING
        const accountName = process.env.AZURE_BLOB_STORAGE_ACCOUNT_NAME
        const accountKey = process.env.AZURE_BLOB_STORAGE_ACCOUNT_KEY

        let baseConfig: any = { containerName: this.containerName }

        // Support both connection string and account name/key authentication
        if (connectionString && connectionString.trim() !== '') {
            baseConfig.account = { connectionString }
        } else {
            baseConfig.account = { name: accountName, key: accountKey }
        }

        if (logType === 'server') {
            return [
                new WinstonAzureBlob({
                    ...baseConfig,
                    blobName: 'logs/server/server',
                    rotatePeriod: 'YYYY-MM-DD',
                    extension: '.log',
                    level: 'info'
                })
            ]
        } else if (logType === 'error') {
            return [
                new WinstonAzureBlob({
                    ...baseConfig,
                    blobName: 'logs/error/server-error',
                    rotatePeriod: 'YYYY-MM-DD',
                    extension: '.log',
                    level: 'error'
                })
            ]
        } else if (logType === 'requests') {
            return [
                new WinstonAzureBlob({
                    ...baseConfig,
                    blobName: 'logs/requests/server-requests',
                    rotatePeriod: 'YYYY-MM-DD',
                    extension: '.log.jsonl',
                    level: 'debug'
                })
            ]
        }
        return []
    }
}
