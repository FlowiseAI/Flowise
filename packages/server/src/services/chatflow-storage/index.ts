import { StatusCodes } from 'http-status-codes'
import { PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand, S3Client, S3ClientConfig } from '@aws-sdk/client-s3'
import { Readable } from 'node:stream'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import path from 'path'
import fs from 'fs'

export interface ChatFlowVersion {
    version: number
    timestamp: string
    record: any // Full database record
    metadata?: {
        size: number
        lastModified: Date
    }
}

export interface ChatFlowVersionList {
    chatflowId: string
    currentVersion: number
    versions: ChatFlowVersion[]
}

class ChatFlowStorageService {
    private getUserHome(): string {
        return process.env[process.platform == 'win32' ? 'USERPROFILE' : 'HOME'] || ''
    }

    private getStoragePath(): string {
        return process.env.BLOB_STORAGE_PATH
            ? path.join(process.env.BLOB_STORAGE_PATH)
            : path.join(this.getUserHome(), '.flowise', 'storage')
    }

    private getStorageType(): string {
        return process.env.STORAGE_TYPE ? process.env.STORAGE_TYPE : 'local'
    }

    private getS3Config() {
        const accessKeyId = process.env.S3_STORAGE_ACCESS_KEY_ID
        const secretAccessKey = process.env.S3_STORAGE_SECRET_ACCESS_KEY
        const region = process.env.S3_STORAGE_REGION
        const Bucket = process.env.S3_STORAGE_BUCKET_NAME
        const customURL = process.env.S3_ENDPOINT_URL
        const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true' ? true : false

        if (!region || !Bucket) {
            throw new Error('S3 storage configuration is missing')
        }

        const s3Config: S3ClientConfig = {
            region: region,
            endpoint: customURL,
            forcePathStyle: forcePathStyle
        }

        if (accessKeyId && secretAccessKey) {
            s3Config.credentials = {
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey
            }
        }

        const s3Client = new S3Client(s3Config)

        return { s3Client, Bucket }
    }

    private getS3Key(chatflowId: string, filename: string): string {
        return `ChatFlows/${chatflowId}/${filename}`
    }

    private getLocalPath(chatflowId: string, filename: string): string {
        return path.join(this.getStoragePath(), 'ChatFlows', chatflowId, filename)
    }

    async saveVersionedChatflow(chatflowId: string, version: number, record: any): Promise<void> {
        try {
            const storageType = this.getStorageType()
            const timestamp = new Date().toISOString()

            const recordJson = JSON.stringify(record, null, 2)

            if (storageType === 's3') {
                const { s3Client, Bucket } = this.getS3Config()

                // Save as versioned file
                const versionKey = this.getS3Key(chatflowId, `versions/v${version}_${timestamp}.json`)
                await s3Client.send(
                    new PutObjectCommand({
                        Bucket,
                        Key: versionKey,
                        Body: recordJson,
                        ContentType: 'application/json'
                    })
                )

                // Also save as current version
                const currentKey = this.getS3Key(chatflowId, `${chatflowId}.json`)
                await s3Client.send(
                    new PutObjectCommand({
                        Bucket,
                        Key: currentKey,
                        Body: recordJson,
                        ContentType: 'application/json'
                    })
                )
            } else {
                // Save as versioned file
                const versionPath = this.getLocalPath(chatflowId, `versions/v${version}_${timestamp}.json`)
                const versionDir = path.dirname(versionPath)

                if (!fs.existsSync(versionDir)) {
                    fs.mkdirSync(versionDir, { recursive: true })
                }

                fs.writeFileSync(versionPath, recordJson, 'utf8')

                // Also save as current version
                const currentPath = this.getLocalPath(chatflowId, `${chatflowId}.json`)
                fs.writeFileSync(currentPath, recordJson, 'utf8')
            }
        } catch (error) {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error saving chatflow version: ${getErrorMessage(error)}`)
        }
    }

    async getChatflowVersion(chatflowId: string, version?: number): Promise<any | null> {
        try {
            const storageType = this.getStorageType()

            if (storageType === 's3') {
                const { s3Client, Bucket } = this.getS3Config()

                if (version) {
                    // Get specific version - need to find the file with this version number
                    const prefix = this.getS3Key(chatflowId, 'versions/')
                    const listResponse = await s3Client.send(
                        new ListObjectsV2Command({
                            Bucket,
                            Prefix: prefix
                        })
                    )

                    const versionFile = listResponse.Contents?.find((obj) => obj.Key?.includes(`v${version}_`))

                    if (!versionFile || !versionFile.Key) {
                        return null
                    }

                    const response = await s3Client.send(
                        new GetObjectCommand({
                            Bucket,
                            Key: versionFile.Key
                        })
                    )

                    if (response.Body instanceof Readable) {
                        const content = await response.Body.transformToString('utf8')
                        return JSON.parse(content)
                    }
                } else {
                    // Get published version
                    const key = this.getS3Key(chatflowId, `${chatflowId}.json`)

                    try {
                        const response = await s3Client.send(
                            new GetObjectCommand({
                                Bucket,
                                Key: key
                            })
                        )

                        if (response.Body instanceof Readable) {
                            const content = await response.Body.transformToString('utf8')
                            return JSON.parse(content)
                        }
                    } catch (error: any) {
                        if (error.name === 'NoSuchKey') {
                            return null
                        }
                        throw error
                    }
                }
            } else {
                if (version) {
                    // Get specific version
                    const versionsDir = this.getLocalPath(chatflowId, 'versions')
                    if (fs.existsSync(versionsDir)) {
                        const files = fs.readdirSync(versionsDir)
                        const versionFile = files.find((file) => file.startsWith(`v${version}_`))

                        if (versionFile) {
                            const filePath = path.join(versionsDir, versionFile)
                            const content = fs.readFileSync(filePath, 'utf8')
                            return JSON.parse(content)
                        }
                    }
                } else {
                    // Get published version
                    const filePath = this.getLocalPath(chatflowId, `${chatflowId}.json`)
                    if (fs.existsSync(filePath)) {
                        const content = fs.readFileSync(filePath, 'utf8')
                        return JSON.parse(content)
                    }
                }
            }

            return null
        } catch (error) {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error getting chatflow version: ${getErrorMessage(error)}`)
        }
    }

    async listChatflowVersions(chatflowId: string): Promise<ChatFlowVersion[]> {
        try {
            const storageType = this.getStorageType()
            const versions: ChatFlowVersion[] = []

            if (storageType === 's3') {
                const { s3Client, Bucket } = this.getS3Config()
                const prefix = this.getS3Key(chatflowId, 'versions/')

                const listResponse = await s3Client.send(
                    new ListObjectsV2Command({
                        Bucket,
                        Prefix: prefix
                    })
                )

                if (listResponse.Contents) {
                    for (const obj of listResponse.Contents) {
                        if (obj.Key) {
                            const filename = path.basename(obj.Key)
                            const match = filename.match(/^v(\d+)_(.+)\.json$/)

                            if (match) {
                                const version = parseInt(match[1])
                                const timestamp = match[2]

                                // Get the content
                                const response = await s3Client.send(
                                    new GetObjectCommand({
                                        Bucket,
                                        Key: obj.Key
                                    })
                                )

                                let flowData = ''
                                if (response.Body instanceof Readable) {
                                    flowData = await response.Body.transformToString('utf8')
                                }

                                versions.push({
                                    version,
                                    timestamp,
                                    record: JSON.parse(flowData),
                                    metadata: {
                                        size: obj.Size || 0,
                                        lastModified: obj.LastModified || new Date()
                                    }
                                })
                            }
                        }
                    }
                }
            } else {
                const versionsDir = this.getLocalPath(chatflowId, 'versions')

                if (fs.existsSync(versionsDir)) {
                    const files = fs.readdirSync(versionsDir)

                    for (const filename of files) {
                        const match = filename.match(/^v(\d+)_(.+)\.json$/)

                        if (match) {
                            const version = parseInt(match[1])
                            const timestamp = match[2]
                            const filePath = path.join(versionsDir, filename)

                            const flowData = fs.readFileSync(filePath, 'utf8')
                            const stats = fs.statSync(filePath)

                            versions.push({
                                version,
                                timestamp,
                                record: JSON.parse(flowData),
                                metadata: {
                                    size: stats.size,
                                    lastModified: stats.mtime
                                }
                            })
                        }
                    }
                }
            }

            // Sort by version number descending
            return versions.sort((a, b) => b.version - a.version)
        } catch (error) {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error listing chatflow versions: ${getErrorMessage(error)}`)
        }
    }

    async rollbackToVersion(chatflowId: string, version: number, user?: any): Promise<void> {
        try {
            const versionContent = await this.getChatflowVersion(chatflowId, version)
            if (!versionContent) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Version ${version} not found`)
            }

            // versionContent is already a parsed object from getChatflowVersion
            const recordData = versionContent

            // Create a new version with the rollback content
            const newVersion = (recordData.currentVersion || 1) + 1
            recordData.currentVersion = newVersion

            // Add rollback metadata if user is provided
            if (user) {
                recordData.versionMetadata = {
                    originalUserId: recordData.userId, // Preserve original chatflow owner
                    editedByUserId: user.id, // Track who performed the rollback
                    editedByName: user.name || 'Unknown User',
                    editedByEmail: user.email,
                    isRollback: true,
                    rolledBackFromVersion: version
                }
            }

            await this.saveVersionedChatflow(chatflowId, newVersion, recordData)
        } catch (error) {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error rolling back to version: ${getErrorMessage(error)}`)
        }
    }

    async deleteChatflowStorage(chatflowId: string): Promise<void> {
        try {
            const storageType = this.getStorageType()

            if (storageType === 's3') {
                const { s3Client, Bucket } = this.getS3Config()
                const prefix = `ChatFlows/${chatflowId}/`

                // List all objects with this prefix
                const listResponse = await s3Client.send(
                    new ListObjectsV2Command({
                        Bucket,
                        Prefix: prefix
                    })
                )

                if (listResponse.Contents && listResponse.Contents.length > 0) {
                    // Delete all objects
                    for (const obj of listResponse.Contents) {
                        if (obj.Key) {
                            await s3Client.send(
                                new DeleteObjectCommand({
                                    Bucket,
                                    Key: obj.Key
                                })
                            )
                        }
                    }
                }
            } else {
                const chatflowDir = path.join(this.getStoragePath(), 'ChatFlows', chatflowId)

                if (fs.existsSync(chatflowDir)) {
                    fs.rmSync(chatflowDir, { recursive: true, force: true })
                }
            }
        } catch (error) {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error deleting chatflow storage: ${getErrorMessage(error)}`)
        }
    }
}

export default new ChatFlowStorageService()
