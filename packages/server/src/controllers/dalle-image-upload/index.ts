import type { Request, Response, NextFunction } from 'express'
import { addSingleFileToStorage } from 'flowise-components'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

// Import storage utilities from flowise-components
const getStorageType = (): string => {
    return process.env.STORAGE_TYPE ? process.env.STORAGE_TYPE : 'local'
}

const getStoragePath = (): string => {
    const userHome = process.env.HOME || process.env.USERPROFILE || ''
    return process.env.BLOB_STORAGE_PATH ? path.join(process.env.BLOB_STORAGE_PATH) : path.join(userHome, '.flowise', 'storage')
}

const getS3Config = () => {
    const s3Config: any = {
        credentials: {
            accessKeyId: process.env.S3_STORAGE_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.S3_STORAGE_SECRET_ACCESS_KEY || ''
        },
        region: process.env.S3_STORAGE_REGION || 'us-east-1'
    }

    if (process.env.S3_ENDPOINT_URL) {
        s3Config.endpoint = process.env.S3_ENDPOINT_URL
        s3Config.forcePathStyle = true
    }

    const s3Client = new S3Client(s3Config)
    const Bucket = process.env.S3_STORAGE_BUCKET_NAME || 'default-bucket'

    return { s3Client, Bucket }
}

const uploadDalleImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body.base64Data || !req.body.filename) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Missing required fields: base64Data and filename')
        }

        const { base64Data, filename, organizationId, userId, fullResponse } = req.body

        if (!organizationId || !userId) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Missing required fields: organizationId and userId')
        }

        // Convert base64 to Buffer
        const buffer = Buffer.from(base64Data, 'base64')

        // Generate unique identifier for this image generation session
        const timestamp = Date.now()
        const randomSuffix = crypto.randomBytes(8).toString('hex')
        const sessionId = `${timestamp}_${randomSuffix}`

        // Create image filename with session ID
        const imageFilename = `${sessionId}_${filename}`

        // Store the image using organization/user folder structure
        const imageStorageUrl = await addSingleFileToStorage('image/png', buffer, imageFilename, 'dalle-images', organizationId, userId)

        // Store the full OpenAI response as JSON if provided
        let jsonStorageUrl = null
        if (fullResponse) {
            const jsonFilename = `${sessionId}_response.json`
            const jsonBuffer = Buffer.from(JSON.stringify(fullResponse, null, 2), 'utf8')
            jsonStorageUrl = await addSingleFileToStorage(
                'application/json',
                jsonBuffer,
                jsonFilename,
                'dalle-images',
                organizationId,
                userId
            )
        }

        // Convert FILE-STORAGE:: reference to a full URL
        const imageFileName = imageStorageUrl.replace('FILE-STORAGE::', '')
        const fullImageUrl = `/api/v1/get-upload-file?chatflowId=dalle-images&chatId=${organizationId}%2F${userId}&fileName=${imageFileName}`

        const response: {
            url: string
            success: boolean
            sessionId: string
            jsonUrl?: string
        } = {
            url: fullImageUrl,
            success: true,
            sessionId
        }

        // Add JSON URL to response if JSON was stored
        if (jsonStorageUrl) {
            const jsonFileName = jsonStorageUrl.replace('FILE-STORAGE::', '')
            response.jsonUrl = `/api/v1/get-upload-file?chatflowId=dalle-images&chatId=${organizationId}%2F${userId}&fileName=${jsonFileName}`
        }

        return res.json(response)
    } catch (error) {
        next(error)
    }
}

const listArchivedImages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { organizationId, userId } = req.query

        if (!organizationId || !userId) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Missing required query parameters: organizationId and userId')
        }

        const page = Number.parseInt(req.query.page as string) || 1
        const limit = Number.parseInt(req.query.limit as string) || 20
        const storageType = getStorageType()

        if (storageType === 's3') {
            const { s3Client, Bucket } = getS3Config()

            // List objects in the user's folder
            const prefix = `dalle-images/${organizationId}/${userId}/`

            const listCommand = new ListObjectsV2Command({
                Bucket,
                Prefix: prefix,
                MaxKeys: 1000 // Get more than we need for pagination
            })

            const response = await s3Client.send(listCommand)
            const allFiles = response.Contents || []

            // Filter for image files and group by session
            const imageSessions = new Map()

            allFiles.forEach((file) => {
                if (!file.Key) return

                const fileName = file.Key.replace(prefix, '')
                const isImage = fileName.match(/\.(png|jpg|jpeg|webp)$/i)
                const isJson = fileName.endsWith('_response.json')

                if (isImage || isJson) {
                    // Extract session ID from filename
                    const sessionMatch = fileName.match(/^(\d+_[a-z0-9]+)_/)
                    if (sessionMatch) {
                        const sessionId = sessionMatch[1]

                        if (!imageSessions.has(sessionId)) {
                            imageSessions.set(sessionId, {
                                sessionId,
                                imageUrl: null,
                                jsonUrl: null,
                                timestamp: new Date(file.LastModified || 0),
                                fileName: ''
                            })
                        }

                        const session = imageSessions.get(sessionId)
                        if (isImage) {
                            session.imageUrl = `/api/v1/get-upload-file?chatflowId=dalle-images&chatId=${organizationId}%2F${userId}&fileName=${fileName}`
                            session.fileName = fileName
                        } else if (isJson) {
                            session.jsonUrl = `/api/v1/get-upload-file?chatflowId=dalle-images&chatId=${organizationId}%2F${userId}&fileName=${fileName}`
                        }
                    }
                }
            })

            // Convert to array and sort by timestamp (newest first)
            const sessions = Array.from(imageSessions.values())
                .filter((session) => session.imageUrl) // Only include sessions with images
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

            // Paginate
            const startIndex = (page - 1) * limit
            const endIndex = startIndex + limit
            const paginatedSessions = sessions.slice(startIndex, endIndex)

            return res.json({
                images: paginatedSessions,
                pagination: {
                    page,
                    limit,
                    total: sessions.length,
                    totalPages: Math.ceil(sessions.length / limit),
                    hasMore: endIndex < sessions.length
                }
            })
        } else {
            // Local storage
            const rootPath = getStoragePath();
            const folderPath = path.resolve(rootPath, 'dalle-images', organizationId as string, userId as string);

            if (!folderPath.startsWith(rootPath)) {
                throw new InternalFlowiseError(StatusCodes.FORBIDDEN, 'Invalid folder path');
            }

            if (!fs.existsSync(folderPath)) {
                return res.json({
                    images: [],
                    pagination: {
                        page,
                        limit,
                        total: 0,
                        totalPages: 0,
                        hasMore: false
                    }
                })
            }

            const files = fs.readdirSync(folderPath)
            const imageSessions = new Map()

            files.forEach((fileName) => {
                const filePath = path.resolve(folderPath, fileName);

                if (!filePath.startsWith(folderPath)) {
                    throw new InternalFlowiseError(StatusCodes.FORBIDDEN, 'Invalid file path');
                }

                const stats = fs.statSync(filePath);

                const isImage = fileName.match(/\.(png|jpg|jpeg|webp)$/i)
                const isJson = fileName.endsWith('_response.json')

                if (isImage || isJson) {
                    // Extract session ID from filename
                    const sessionMatch = fileName.match(/^(\d+_[a-z0-9]+)_/)
                    if (sessionMatch) {
                        const sessionId = sessionMatch[1]

                        if (!imageSessions.has(sessionId)) {
                            imageSessions.set(sessionId, {
                                sessionId,
                                imageUrl: null,
                                jsonUrl: null,
                                timestamp: stats.mtime,
                                fileName: ''
                            })
                        }

                        const session = imageSessions.get(sessionId)
                        if (isImage) {
                            session.imageUrl = `/api/v1/get-upload-file?chatflowId=dalle-images&chatId=${organizationId}%2F${userId}&fileName=${fileName}`
                            session.fileName = fileName
                        } else if (isJson) {
                            session.jsonUrl = `/api/v1/get-upload-file?chatflowId=dalle-images&chatId=${organizationId}%2F${userId}&fileName=${fileName}`
                        }
                    }
                }
            })

            // Convert to array and sort by timestamp (newest first)
            const sessions = Array.from(imageSessions.values())
                .filter((session) => session.imageUrl) // Only include sessions with images
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

            // Paginate
            const startIndex = (page - 1) * limit
            const endIndex = startIndex + limit
            const paginatedSessions = sessions.slice(startIndex, endIndex)

            return res.json({
                images: paginatedSessions,
                pagination: {
                    page,
                    limit,
                    total: sessions.length,
                    totalPages: Math.ceil(sessions.length / limit),
                    hasMore: endIndex < sessions.length
                }
            })
        }
    } catch (error) {
        next(error)
    }
}

export default {
    uploadDalleImage,
    listArchivedImages
}
