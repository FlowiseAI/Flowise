import { Storage, Bucket } from '@google-cloud/storage'
import { LoggingWinston } from '@google-cloud/logging-winston'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import { BaseStorageProvider } from './BaseStorageProvider'
import { FileInfo, StorageResult, StorageSizeResult } from './IStorageProvider'

import MulterGoogleCloudStorage from 'multer-cloud-storage'

export class GCSStorageProvider extends BaseStorageProvider {
    private bucket: Bucket
    private bucketName: string
    private projectId: string | undefined
    private keyFilename: string | undefined

    constructor() {
        super()
        const config = this.initGCSConfig()

        this.bucket = config.bucket
        this.bucketName = config.bucketName
        this.projectId = config.projectId
        this.keyFilename = config.keyFilename
    }

    private initGCSConfig(): {
        bucket: Bucket
        bucketName: string
        projectId: string | undefined
        keyFilename: string | undefined
    } {
        const keyFilename = process.env.GOOGLE_CLOUD_STORAGE_CREDENTIAL
        const projectId = process.env.GOOGLE_CLOUD_STORAGE_PROJ_ID
        const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET_NAME

        if (!bucketName) {
            throw new Error('GOOGLE_CLOUD_STORAGE_BUCKET_NAME env variable is required')
        }

        const storageConfig = {
            ...(keyFilename ? { keyFilename } : {}),
            ...(projectId ? { projectId } : {})
        }

        const storage = new Storage(storageConfig)
        const bucket = storage.bucket(bucketName)
        return { bucket, bucketName, projectId, keyFilename }
    }

    getStorageType(): string {
        return 'gcs'
    }

    getConfig(): any {
        return {
            bucketName: this.bucketName,
            projectId: this.projectId
        }
    }

    private normalizePath(p: string): string {
        return p.replace(/\\/g, '/')
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
        const normalizedChatflowid = this.normalizePath(chatflowid)
        const normalizedFilename = this.normalizePath(sanitizedFilename)
        const filePath = `${orgId}/${normalizedChatflowid}/${normalizedFilename}`

        const file = this.bucket.file(filePath)
        await new Promise<void>((resolve, reject) => {
            file.createWriteStream({ contentType: mime, metadata: { contentEncoding: 'base64' } })
                .on('error', (err) => reject(err))
                .on('finish', () => resolve())
                .end(bf)
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
        const normalizedPaths = paths.map((p) => this.normalizePath(p))
        const normalizedFilename = this.normalizePath(sanitizedFilename)
        const filePath = [...normalizedPaths, normalizedFilename].join('/')

        const file = this.bucket.file(filePath)
        await new Promise<void>((resolve, reject) => {
            file.createWriteStream()
                .on('error', (err) => reject(err))
                .on('finish', () => resolve())
                .end(bf)
        })

        fileNames.push(sanitizedFilename)
        const totalSize = await this.getStorageSize(paths[0])

        return { path: 'FILE-STORAGE::' + JSON.stringify(fileNames), totalSize: totalSize / 1024 / 1024 }
    }

    async addSingleFileToStorage(mime: string, bf: Buffer, fileName: string, ...paths: string[]): Promise<StorageResult> {
        const sanitizedFilename = this.sanitizeFilename(fileName)
        const normalizedPaths = paths.map((p) => this.normalizePath(p))
        const normalizedFilename = this.normalizePath(sanitizedFilename)
        const filePath = [...normalizedPaths, normalizedFilename].join('/')

        const file = this.bucket.file(filePath)
        await new Promise<void>((resolve, reject) => {
            file.createWriteStream({ contentType: mime, metadata: { contentEncoding: 'base64' } })
                .on('error', (err) => reject(err))
                .on('finish', () => resolve())
                .end(bf)
        })

        const totalSize = await this.getStorageSize(paths[0])
        return { path: 'FILE-STORAGE::' + sanitizedFilename, totalSize: totalSize / 1024 / 1024 }
    }

    async getFileFromUpload(filePath: string): Promise<Buffer> {
        const file = this.bucket.file(filePath)
        const [buffer] = await file.download()
        return buffer
    }

    async getFileFromStorage(file: string, ...paths: string[]): Promise<Buffer> {
        const sanitizedFilename = this.sanitizeFilename(file)
        const normalizedPaths = paths.map((p) => this.normalizePath(p))
        const normalizedFilename = this.normalizePath(sanitizedFilename)
        const filePath = [...normalizedPaths, normalizedFilename].join('/')

        try {
            const gcsFile = this.bucket.file(filePath)
            const [buffer] = await gcsFile.download()
            return buffer
        } catch (error) {
            // Fallback: Check if file exists without the first path element (likely orgId)
            if (normalizedPaths.length > 1) {
                const fallbackPaths = normalizedPaths.slice(1)
                const fallbackPath = [...fallbackPaths, normalizedFilename].join('/')

                try {
                    const fallbackFile = this.bucket.file(fallbackPath)
                    const [buffer] = await fallbackFile.download()

                    // Move to correct location with orgId
                    const gcsFile = this.bucket.file(filePath)
                    await new Promise<void>((resolve, reject) => {
                        gcsFile
                            .createWriteStream()
                            .on('error', (err) => reject(err))
                            .on('finish', () => resolve())
                            .end(buffer)
                    })

                    // Delete the old file
                    await fallbackFile.delete()

                    // Check if the directory is empty and delete recursively if needed
                    if (fallbackPaths.length > 0) {
                        await this.cleanEmptyGCSFolders(fallbackPaths[0])
                    }

                    return buffer
                } catch (fallbackError) {
                    throw error
                }
            } else {
                throw error
            }
        }
    }

    async streamStorageFile(chatflowId: string, chatId: string, fileName: string, orgId: string): Promise<Buffer | undefined> {
        // Validate chatflowId and chatId
        this.validateChatflowId(chatflowId)
        this.validatePathSecurity(chatflowId, chatId)

        const sanitizedFilename = this.sanitizeFilename(fileName)
        const normalizedChatflowId = this.normalizePath(chatflowId)
        const normalizedChatId = this.normalizePath(chatId)
        const normalizedFilename = this.normalizePath(sanitizedFilename)
        const filePath = `${orgId}/${normalizedChatflowId}/${normalizedChatId}/${normalizedFilename}`

        try {
            const [buffer] = await this.bucket.file(filePath).download()
            return buffer
        } catch (error) {
            // Fallback: Check if file exists without orgId
            const fallbackPath = `${normalizedChatflowId}/${normalizedChatId}/${normalizedFilename}`
            try {
                const fallbackFile = this.bucket.file(fallbackPath)
                const [buffer] = await fallbackFile.download()

                // If found, copy to correct location with orgId
                if (buffer) {
                    const file = this.bucket.file(filePath)
                    await new Promise<void>((resolve, reject) => {
                        file.createWriteStream()
                            .on('error', (err) => reject(err))
                            .on('finish', () => resolve())
                            .end(buffer)
                    })

                    // Delete the old file
                    await fallbackFile.delete()

                    // Check if the directory is empty and delete recursively if needed
                    await this.cleanEmptyGCSFolders(normalizedChatflowId)

                    return buffer
                }
            } catch (fallbackError) {
                throw new Error(`File ${fileName} not found`)
            }
        }
    }

    async getFilesListFromStorage(...paths: string[]): Promise<FileInfo[]> {
        const normalizedPaths = paths.map((p) => this.normalizePath(p))
        const prefix = normalizedPaths.join('/')

        const [files] = await this.bucket.getFiles({ prefix })

        return files.map((file) => ({
            name: file.name.split('/').pop() || '',
            path: file.name,
            size: typeof file.metadata.size === 'string' ? parseInt(file.metadata.size, 10) || 0 : file.metadata.size || 0
        }))
    }

    async removeFilesFromStorage(...paths: string[]): Promise<StorageSizeResult> {
        const normalizedPath = paths.map((p) => this.normalizePath(p)).join('/')
        await this.bucket.deleteFiles({ prefix: `${normalizedPath}/` })

        const totalSize = await this.getStorageSize(paths[0])
        return { totalSize: totalSize / 1024 / 1024 }
    }

    async removeSpecificFileFromUpload(filePath: string): Promise<void> {
        await this.bucket.file(filePath).delete()
    }

    async removeSpecificFileFromStorage(...paths: string[]): Promise<StorageSizeResult> {
        const fileName = paths.pop()
        if (fileName) {
            const sanitizedFilename = this.sanitizeFilename(fileName)
            paths.push(sanitizedFilename)
        }
        const normalizedPath = paths.map((p) => this.normalizePath(p)).join('/')
        await this.bucket.file(normalizedPath).delete()

        const totalSize = await this.getStorageSize(paths[0])
        return { totalSize: totalSize / 1024 / 1024 }
    }

    async removeFolderFromStorage(...paths: string[]): Promise<StorageSizeResult> {
        const normalizedPath = paths.map((p) => this.normalizePath(p)).join('/')
        await this.bucket.deleteFiles({ prefix: `${normalizedPath}/` })

        const totalSize = await this.getStorageSize(paths[0])
        return { totalSize: totalSize / 1024 / 1024 }
    }

    private async cleanEmptyGCSFolders(prefix: string): Promise<void> {
        try {
            if (!prefix) return

            const [files] = await this.bucket.getFiles({
                prefix: prefix + '/',
                delimiter: '/'
            })

            if (files.length === 0) {
                try {
                    await this.bucket.file(prefix + '/').delete()
                } catch (err) {
                    // Folder marker might not exist, ignore
                }

                const parentPrefix = prefix.substring(0, prefix.lastIndexOf('/'))
                if (parentPrefix) {
                    await this.cleanEmptyGCSFolders(parentPrefix)
                }
            }
        } catch (error) {
            console.error('Error cleaning empty GCS folders:', error)
        }
    }

    async getStorageSize(orgId: string): Promise<number> {
        if (!orgId) return 0

        const [files] = await this.bucket.getFiles({ prefix: orgId })
        let totalSize = 0

        for (const file of files) {
            const size = file.metadata.size
            if (typeof size === 'string') {
                totalSize += parseInt(size, 10) || 0
            } else if (typeof size === 'number') {
                totalSize += size
            }
        }

        return totalSize
    }

    getMulterStorage(): multer.Multer {
        return multer({
            storage: new MulterGoogleCloudStorage({
                projectId: this.projectId,
                bucket: this.bucketName,
                keyFilename: this.keyFilename,
                uniformBucketLevelAccess: Boolean(process.env.GOOGLE_CLOUD_UNIFORM_BUCKET_ACCESS) ?? true,
                destination: `uploads/${uuidv4()}`
            })
        })
    }

    getLoggerTransports(logType: 'server' | 'error' | 'requests', config?: any): any[] {
        const gcsConfig = {
            projectId: this.projectId,
            keyFilename: this.keyFilename,
            defaultCallback: (err: any) => {
                if (err) {
                    console.error('Error logging to GCS: ' + err)
                }
            }
        }

        if (logType === 'server') {
            return [
                new LoggingWinston({
                    ...gcsConfig,
                    logName: 'server'
                })
            ]
        } else if (logType === 'error') {
            return [
                new LoggingWinston({
                    ...gcsConfig,
                    logName: 'error'
                })
            ]
        } else if (logType === 'requests') {
            return [
                new LoggingWinston({
                    ...gcsConfig,
                    logName: 'requests'
                })
            ]
        }
        return []
    }
}
