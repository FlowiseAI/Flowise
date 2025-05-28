import type { Request, Response, NextFunction } from 'express'
import { addSingleFileToStorage } from 'flowise-components'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import dalleImageService from '../../services/dalle-image'

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

// New endpoint: Generate images (calls OpenAI + uploads)
const generateDalleImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            prompt,
            model,
            n,
            size,
            quality,
            style,
            response_format,
            output_format,
            background,
            output_compression,
            // User context can come from Next.js proxy
            organizationId,
            userId,
            userEmail
        } = req.body

        // Validate required fields
        if (!prompt) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Missing required field: prompt')
        }

        // Get user context from authentication middleware OR request body (Next.js proxy/tool)
        let user = req.user || { id: userId, organizationId, email: userEmail }

        // For internal tool calls without user context, use default system context
        if (!user?.id && req.headers['x-request-from'] === 'internal') {
            user = {
                id: 'tool-system',
                organizationId: 'system-org',
                email: 'tool@system.local'
            }
        }

        if (!user?.id || !user?.organizationId) {
            throw new InternalFlowiseError(
                StatusCodes.UNAUTHORIZED,
                'User context required for image generation. Please ensure organizationId and userId are provided.'
            )
        }

        // Set defaults
        const requestData = {
            prompt,
            model: model || 'dall-e-3',
            n: n || 1,
            size: size || '1024x1024',
            quality: quality || 'standard',
            style,
            response_format,
            output_format,
            background,
            output_compression,
            organizationId: user.organizationId,
            userId: user.id,
            userEmail: user.email
        }

        // Call OpenAI API
        const openaiResponse = await dalleImageService.generateDalleImages(requestData)
        const images = []

        if (openaiResponse.data && Array.isArray(openaiResponse.data)) {
            for (let i = 0; i < openaiResponse.data.length; i++) {
                const item = openaiResponse.data[i]
                const base64 = item.b64_json
                if (base64) {
                    try {
                        // Generate a descriptive filename
                        const timestamp = Date.now()
                        const imageIndex = i + 1
                        const fileExtension = output_format || 'png'
                        const filename = `dalle_${model}_${timestamp}_${imageIndex}.${fileExtension}`

                        // Upload to storage using the same process as the upload endpoint
                        const uploadResult = await uploadImageToStorage({
                            base64Data: base64,
                            filename,
                            organizationId: user.organizationId,
                            userId: user.id,
                            fullResponse: openaiResponse
                        })

                        images.push(uploadResult)
                    } catch (uploadError) {
                        console.error('Error uploading image:', uploadError)
                        // Fallback to base64 if storage fails
                        images.push({ b64_json: base64 })
                    }
                }
            }
        }

        return res.json({
            data: images
        })
    } catch (error) {
        next(error)
    }
}

// Helper function to upload image to storage (shared logic)
const uploadImageToStorage = async (data: {
    base64Data: string
    filename: string
    organizationId: string
    userId: string
    fullResponse: any
}) => {
    const { base64Data, filename, organizationId, userId, fullResponse } = data

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
        jsonStorageUrl = await addSingleFileToStorage('application/json', jsonBuffer, jsonFilename, 'dalle-images', organizationId, userId)
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

    return response
}

// Existing upload functionality (moved from dalle-image-upload)
const uploadDalleImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body.base64Data || !req.body.filename) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Missing required fields:base64Data and filename')
        }

        const { base64Data, filename, organizationId, userId, fullResponse } = req.body

        if (!organizationId || !userId) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Missing required fields: organizationId and userId')
        }

        const result = await uploadImageToStorage({
            base64Data,
            filename,
            organizationId,
            userId,
            fullResponse
        })

        return res.json(result)
    } catch (error) {
        next(error)
    }
}

// Existing archive functionality (moved from dalle-image-upload)
const listArchivedImages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Get user context from authentication middleware (same as generate endpoint)
        const user = req.user

        if (!user?.id || !user?.organizationId) {
            throw new InternalFlowiseError(
                StatusCodes.UNAUTHORIZED,
                'User context required for archive access.Please ensure you are authenticated.'
            )
        }

        // Use the properly mapped Flowise user/org IDs from req.user
        const organizationId = user.organizationId
        const userId = user.id

        console.log('Archive endpoint - Using Flowise user IDs:', {
            userId: userId,
            organizationId: organizationId,
            email: user.email
        })

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
            // Local storage implementation
            const rootPath = getStoragePath()
            const folderPath = path.resolve(rootPath, 'dalle-images', organizationId as string, userId as string)

            if (!folderPath.startsWith(rootPath)) {
                throw new InternalFlowiseError(StatusCodes.FORBIDDEN, 'Invalid folder path')
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

            // Read all files in the directory
            const allFiles = fs.readdirSync(folderPath)

            // Filter for image files and group by session
            const imageSessions = new Map()

            allFiles.forEach((fileName) => {
                const filePath = path.join(folderPath, fileName)
                const stats = fs.statSync(filePath)
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
    generateDalleImage,
    uploadDalleImage,
    listArchivedImages
}
