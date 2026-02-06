import {
    DeleteObjectsCommand,
    GetObjectCommand,
    ListObjectsCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    S3Client,
    S3ClientConfig
} from '@aws-sdk/client-s3'
import { Readable } from 'node:stream'
import multer from 'multer'
import multerS3 from 'multer-s3'
import { transports } from 'winston'
import { v4 as uuidv4 } from 'uuid'
import { BaseStorageProvider } from './BaseStorageProvider'
import { FileInfo, StorageResult } from './IStorageProvider'

const { S3StreamLogger } = require('s3-streamlogger')

export class S3StorageProvider extends BaseStorageProvider {
    private s3Client: S3Client
    private bucket: string
    private s3Config: S3ClientConfig

    constructor() {
        super()
        const config = this.initS3Config()
        this.s3Client = config.s3Client
        this.bucket = config.bucket
        this.s3Config = config.s3Config
    }

    private initS3Config(): { s3Client: S3Client; bucket: string; s3Config: S3ClientConfig } {
        const accessKeyId = process.env.S3_STORAGE_ACCESS_KEY_ID
        const secretAccessKey = process.env.S3_STORAGE_SECRET_ACCESS_KEY
        const region = process.env.S3_STORAGE_REGION
        const bucket = process.env.S3_STORAGE_BUCKET_NAME
        const customURL = process.env.S3_ENDPOINT_URL
        const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true'

        if (!region || region.trim() === '' || !bucket || bucket.trim() === '') {
            throw new Error('S3 storage configuration is missing')
        }

        const s3Config: S3ClientConfig = {
            region: region,
            forcePathStyle: forcePathStyle
        }

        // Only include endpoint if customURL is not empty
        if (customURL && customURL.trim() !== '') {
            s3Config.endpoint = customURL
        }

        if (accessKeyId && accessKeyId.trim() !== '' && secretAccessKey && secretAccessKey.trim() !== '') {
            s3Config.credentials = {
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey
            }
        }

        const s3Client = new S3Client(s3Config)
        return { s3Client, bucket, s3Config }
    }

    getStorageType(): string {
        return 's3'
    }

    getConfig(): any {
        return {
            bucket: this.bucket,
            region: process.env.S3_STORAGE_REGION,
            endpoint: process.env.S3_ENDPOINT_URL
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
        const Key = orgId + '/' + chatflowid + '/' + sanitizedFilename

        const putObjCmd = new PutObjectCommand({
            Bucket: this.bucket,
            Key,
            ContentEncoding: 'base64',
            ContentType: mime,
            Body: bf
        })
        await this.s3Client.send(putObjCmd)

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

        let Key = paths.reduce((acc, cur) => acc + '/' + cur, '') + '/' + sanitizedFilename
        if (Key.startsWith('/')) {
            Key = Key.substring(1)
        }

        const putObjCmd = new PutObjectCommand({
            Bucket: this.bucket,
            Key,
            ContentEncoding: 'base64',
            ContentType: mime,
            Body: bf
        })
        await this.s3Client.send(putObjCmd)
        fileNames.push(sanitizedFilename)

        const totalSize = await this.getStorageSize(paths[0])
        return { path: 'FILE-STORAGE::' + JSON.stringify(fileNames), totalSize: totalSize / 1024 / 1024 }
    }

    async addSingleFileToStorage(mime: string, bf: Buffer, fileName: string, ...paths: string[]): Promise<StorageResult> {
        const sanitizedFilename = this.sanitizeFilename(fileName)

        let Key = paths.reduce((acc, cur) => acc + '/' + cur, '') + '/' + sanitizedFilename
        if (Key.startsWith('/')) {
            Key = Key.substring(1)
        }

        const putObjCmd = new PutObjectCommand({
            Bucket: this.bucket,
            Key,
            ContentEncoding: 'base64',
            ContentType: mime,
            Body: bf
        })
        await this.s3Client.send(putObjCmd)

        const totalSize = await this.getStorageSize(paths[0])
        return { path: 'FILE-STORAGE::' + sanitizedFilename, totalSize: totalSize / 1024 / 1024 }
    }

    async getFileFromUpload(filePath: string): Promise<Buffer> {
        // For S3, the filePath is the S3 key
        let Key = filePath
        if (Key.startsWith('/')) {
            Key = Key.substring(1)
        }

        const getParams = {
            Bucket: this.bucket,
            Key
        }

        const response = await this.s3Client.send(new GetObjectCommand(getParams))
        const body = response.Body
        if (body instanceof Readable) {
            const streamToString = await body.transformToString('base64')
            if (streamToString) {
                return Buffer.from(streamToString, 'base64')
            }
        }
        // @ts-ignore
        const buffer = Buffer.concat(response.Body.toArray())
        return buffer
    }

    async getFileFromStorage(file: string, ...paths: string[]): Promise<Buffer> {
        const sanitizedFilename = this.sanitizeFilename(file)

        let Key = paths.reduce((acc, cur) => acc + '/' + cur, '') + '/' + sanitizedFilename
        if (Key.startsWith('/')) {
            Key = Key.substring(1)
        }

        try {
            const getParams = {
                Bucket: this.bucket,
                Key
            }

            const response = await this.s3Client.send(new GetObjectCommand(getParams))
            const body = response.Body
            if (body instanceof Readable) {
                const streamToString = await body.transformToString('base64')
                if (streamToString) {
                    return Buffer.from(streamToString, 'base64')
                }
            }
            // @ts-ignore
            const buffer = Buffer.concat(response.Body.toArray())
            return buffer
        } catch (error) {
            // Fallback: Check if file exists without the first path element (likely orgId)
            if (paths.length > 1) {
                const fallbackPaths = paths.slice(1)
                let fallbackKey = fallbackPaths.reduce((acc, cur) => acc + '/' + cur, '') + '/' + sanitizedFilename
                if (fallbackKey.startsWith('/')) {
                    fallbackKey = fallbackKey.substring(1)
                }

                try {
                    const fallbackParams = {
                        Bucket: this.bucket,
                        Key: fallbackKey
                    }
                    const fallbackResponse = await this.s3Client.send(new GetObjectCommand(fallbackParams))
                    const fallbackBody = fallbackResponse.Body

                    // Get the file content
                    let fileContent: Buffer
                    if (fallbackBody instanceof Readable) {
                        const streamToString = await fallbackBody.transformToString('base64')
                        if (streamToString) {
                            fileContent = Buffer.from(streamToString, 'base64')
                        } else {
                            // @ts-ignore
                            fileContent = Buffer.concat(fallbackBody.toArray())
                        }
                    } else {
                        // @ts-ignore
                        fileContent = Buffer.concat(fallbackBody.toArray())
                    }

                    // Move to correct location with orgId
                    const putObjCmd = new PutObjectCommand({
                        Bucket: this.bucket,
                        Key,
                        Body: fileContent
                    })
                    await this.s3Client.send(putObjCmd)

                    // Delete the old file
                    await this.s3Client.send(
                        new DeleteObjectsCommand({
                            Bucket: this.bucket,
                            Delete: {
                                Objects: [{ Key: fallbackKey }],
                                Quiet: false
                            }
                        })
                    )

                    // Check if the directory is empty and delete recursively if needed
                    if (fallbackPaths.length > 0) {
                        await this.cleanEmptyS3Folders(fallbackPaths[0])
                    }

                    return fileContent
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
        const Key = orgId + '/' + chatflowId + '/' + chatId + '/' + sanitizedFilename

        const getParams = {
            Bucket: this.bucket,
            Key
        }

        try {
            const response = await this.s3Client.send(new GetObjectCommand(getParams))
            const body = response.Body
            if (body instanceof Readable) {
                const blob = await body.transformToByteArray()
                return Buffer.from(blob)
            }
        } catch (error) {
            // Fallback: Check if file exists without orgId
            const fallbackKey = chatflowId + '/' + chatId + '/' + sanitizedFilename
            try {
                const fallbackParams = {
                    Bucket: this.bucket,
                    Key: fallbackKey
                }
                const fallbackResponse = await this.s3Client.send(new GetObjectCommand(fallbackParams))
                const fallbackBody = fallbackResponse.Body

                // If found, copy to correct location with orgId
                if (fallbackBody) {
                    let fileContent: Buffer
                    if (fallbackBody instanceof Readable) {
                        const blob = await fallbackBody.transformToByteArray()
                        fileContent = Buffer.from(blob)
                    } else {
                        // @ts-ignore
                        fileContent = Buffer.concat(fallbackBody.toArray())
                    }

                    // Move to correct location with orgId
                    const putObjCmd = new PutObjectCommand({
                        Bucket: this.bucket,
                        Key,
                        Body: fileContent
                    })
                    await this.s3Client.send(putObjCmd)

                    // Delete the old file
                    await this.s3Client.send(
                        new DeleteObjectsCommand({
                            Bucket: this.bucket,
                            Delete: {
                                Objects: [{ Key: fallbackKey }],
                                Quiet: false
                            }
                        })
                    )

                    // Check if the directory is empty and delete recursively if needed
                    await this.cleanEmptyS3Folders(chatflowId)

                    return fileContent
                }
            } catch (fallbackError) {
                throw new Error(`File ${fileName} not found`)
            }
        }
    }

    async getFilesListFromStorage(...paths: string[]): Promise<FileInfo[]> {
        let Key = paths.reduce((acc, cur) => acc + '/' + cur, '')
        if (Key.startsWith('/')) {
            Key = Key.substring(1)
        }

        const listCommand = new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: Key
        })
        const list = await this.s3Client.send(listCommand)

        if (list.Contents && list.Contents.length > 0) {
            return list.Contents.map((item) => ({
                name: item.Key?.split('/').pop() || '',
                path: item.Key ?? '',
                size: item.Size || 0
            }))
        } else {
            return []
        }
    }

    async removeFilesFromStorage(...paths: string[]): Promise<StorageResult> {
        let Key = paths.reduce((acc, cur) => acc + '/' + cur, '')
        if (Key.startsWith('/')) {
            Key = Key.substring(1)
        }

        await this.deleteS3Folder(Key)

        const totalSize = await this.getStorageSize(paths[0])
        return { totalSize: totalSize / 1024 / 1024 }
    }

    async removeSpecificFileFromUpload(filePath: string): Promise<void> {
        let Key = filePath
        if (Key.startsWith('/')) {
            Key = Key.substring(1)
        }
        await this.deleteS3Folder(Key)
    }

    async removeSpecificFileFromStorage(...paths: string[]): Promise<StorageResult> {
        let Key = paths.reduce((acc, cur) => acc + '/' + cur, '')
        if (Key.startsWith('/')) {
            Key = Key.substring(1)
        }
        await this.deleteS3Folder(Key)

        const totalSize = await this.getStorageSize(paths[0])
        return { totalSize: totalSize / 1024 / 1024 }
    }

    async removeFolderFromStorage(...paths: string[]): Promise<StorageResult> {
        let Key = paths.reduce((acc, cur) => acc + '/' + cur, '')
        if (Key.startsWith('/')) {
            Key = Key.substring(1)
        }
        await this.deleteS3Folder(Key)

        const totalSize = await this.getStorageSize(paths[0])
        return { totalSize: totalSize / 1024 / 1024 }
    }

    private async deleteS3Folder(location: string): Promise<string> {
        let count = 0

        const recursiveS3Delete = async (token?: string): Promise<string> => {
            const listCommand = new ListObjectsV2Command({
                Bucket: this.bucket,
                Prefix: location,
                ContinuationToken: token
            })
            const list = await this.s3Client.send(listCommand)

            if (list.KeyCount) {
                const deleteCommand = new DeleteObjectsCommand({
                    Bucket: this.bucket,
                    Delete: {
                        Objects: list.Contents?.map((item) => ({ Key: item.Key })),
                        Quiet: false
                    }
                })
                const deleted = await this.s3Client.send(deleteCommand)
                // @ts-ignore
                count += deleted.Deleted?.length || 0

                if (deleted.Errors) {
                    deleted.Errors.map((error: any) => console.error(`${error.Key} could not be deleted - ${error.Code}`))
                }
            }

            if (list.NextContinuationToken) {
                return recursiveS3Delete(list.NextContinuationToken)
            }

            return `${count} files deleted from S3`
        }

        return recursiveS3Delete()
    }

    private async cleanEmptyS3Folders(prefix: string): Promise<void> {
        try {
            if (!prefix) return

            const listCmd = new ListObjectsV2Command({
                Bucket: this.bucket,
                Prefix: prefix + '/',
                Delimiter: '/'
            })

            const response = await this.s3Client.send(listCmd)

            if (
                (response.Contents?.length === 0 || !response.Contents) &&
                (response.CommonPrefixes?.length === 0 || !response.CommonPrefixes)
            ) {
                await this.s3Client.send(
                    new DeleteObjectsCommand({
                        Bucket: this.bucket,
                        Delete: {
                            Objects: [{ Key: prefix + '/' }],
                            Quiet: true
                        }
                    })
                )

                const parentPrefix = prefix.substring(0, prefix.lastIndexOf('/'))
                if (parentPrefix) {
                    await this.cleanEmptyS3Folders(parentPrefix)
                }
            }
        } catch (error) {
            console.error('Error cleaning empty S3 folders:', error)
        }
    }

    async getStorageSize(orgId: string): Promise<number> {
        if (!orgId) return 0

        const getCmd = new ListObjectsCommand({
            Bucket: this.bucket,
            Prefix: orgId
        })
        const headObj = await this.s3Client.send(getCmd)
        let totalSize = 0
        for (const obj of headObj.Contents || []) {
            totalSize += obj.Size || 0
        }
        return totalSize
    }

    getMulterStorage(): multer.Multer {
        return multer({
            storage: multerS3({
                s3: this.s3Client,
                bucket: this.bucket,
                metadata: function (req: any, file: any, cb: any) {
                    cb(null, { fieldName: file.fieldname, originalName: file.originalname })
                },
                key: function (req: any, file: any, cb: any) {
                    cb(null, `${uuidv4()}`)
                }
            })
        })
    }

    getLoggerTransports(logType: 'server' | 'error' | 'requests', config?: any): any[] {
        if (logType === 'server') {
            const s3ServerStream = new S3StreamLogger({
                bucket: this.bucket,
                folder: 'logs/server',
                name_format: `server-%Y-%m-%d-%H-%M-%S-%L.log`,
                config: this.s3Config
            })
            return [new transports.Stream({ stream: s3ServerStream })]
        } else if (logType === 'error') {
            const s3ErrorStream = new S3StreamLogger({
                bucket: this.bucket,
                folder: 'logs/error',
                name_format: `server-error-%Y-%m-%d-%H-%M-%S-%L.log`,
                config: this.s3Config
            })
            return [new transports.Stream({ stream: s3ErrorStream })]
        } else if (logType === 'requests') {
            const s3ServerReqStream = new S3StreamLogger({
                bucket: this.bucket,
                folder: 'logs/requests',
                name_format: `server-requests-%Y-%m-%d-%H-%M-%S-%L.log.jsonl`,
                config: this.s3Config
            })
            return [new transports.Stream({ stream: s3ServerReqStream })]
        }
        return []
    }
}
