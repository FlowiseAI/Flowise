import { Request } from 'express'
import * as path from 'path'
import {
    addArrayFilesToStorage,
    getFileFromUpload,
    IDocument,
    mapExtToInputField,
    mapMimeTypeToInputField,
    removeSpecificFileFromUpload,
    isValidUUID,
    isPathTraversal
} from 'flowise-components'
import { getRunningExpressApp } from './getRunningExpressApp'
import { getErrorMessage } from '../errors/utils'
import { checkStorage, updateStorageUsage } from './quotaUsage'
import { ChatFlow } from '../database/entities/ChatFlow'
import { Workspace } from '../enterprise/database/entities/workspace.entity'
import { Organization } from '../enterprise/database/entities/organization.entity'
import { InternalFlowiseError } from '../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'

/**
 * Create attachment
 * @param {Request} req
 */
export const createFileAttachment = async (req: Request) => {
    const appServer = getRunningExpressApp()

    const chatflowid = req.params.chatflowId
    const chatId = req.params.chatId

    if (!chatflowid || !isValidUUID(chatflowid)) {
        throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Invalid chatflowId format - must be a valid UUID')
    }
    if (isPathTraversal(chatflowid) || (chatId && isPathTraversal(chatId))) {
        throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Invalid path characters detected')
    }

    // Validate chatflow exists and check API key
    const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({
        id: chatflowid
    })
    if (!chatflow) {
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowid} not found`)
    }

    let orgId = req.user?.activeOrganizationId || ''
    let workspaceId = req.user?.activeWorkspaceId || ''
    let subscriptionId = req.user?.activeOrganizationSubscriptionId || ''

    // This is one of the WHITELIST_URLS, API can be public and there might be no req.user
    if (!orgId || !workspaceId) {
        const chatflowWorkspaceId = chatflow.workspaceId
        const workspace = await appServer.AppDataSource.getRepository(Workspace).findOneBy({
            id: chatflowWorkspaceId
        })
        if (!workspace) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Workspace ${chatflowWorkspaceId} not found`)
        }
        workspaceId = workspace.id

        const org = await appServer.AppDataSource.getRepository(Organization).findOneBy({
            id: workspace.organizationId
        })
        if (!org) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Organization ${workspace.organizationId} not found`)
        }

        orgId = org.id
        subscriptionId = org.subscriptionId as string
    }

    // Parse chatbot configuration to get file upload settings
    let pdfConfig = {
        usage: 'perPage',
        legacyBuild: false
    }
    let allowedFileTypes: string[] = []
    let fileUploadEnabled = false

    if (chatflow.chatbotConfig) {
        try {
            const chatbotConfig = JSON.parse(chatflow.chatbotConfig)
            if (chatbotConfig?.fullFileUpload) {
                fileUploadEnabled = chatbotConfig.fullFileUpload.status

                // Get allowed file types from configuration
                if (chatbotConfig.fullFileUpload.allowedUploadFileTypes) {
                    allowedFileTypes = chatbotConfig.fullFileUpload.allowedUploadFileTypes.split(',')
                }

                // PDF specific configuration
                if (chatbotConfig.fullFileUpload.pdfFile) {
                    if (chatbotConfig.fullFileUpload.pdfFile.usage) {
                        pdfConfig.usage = chatbotConfig.fullFileUpload.pdfFile.usage
                    }
                    if (chatbotConfig.fullFileUpload.pdfFile.legacyBuild !== undefined) {
                        pdfConfig.legacyBuild = chatbotConfig.fullFileUpload.pdfFile.legacyBuild
                    }
                }
            }
        } catch (e) {
            // Use default config if parsing fails
        }
    }

    // Check if file upload is enabled
    if (!fileUploadEnabled) {
        throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'File upload is not enabled for this chatflow')
    }

    // Find FileLoader node
    const fileLoaderComponent = appServer.nodesPool.componentNodes['fileLoader']
    const fileLoaderNodeInstanceFilePath = fileLoaderComponent.filePath as string
    const fileLoaderNodeModule = await import(fileLoaderNodeInstanceFilePath)
    const fileLoaderNodeInstance = new fileLoaderNodeModule.nodeClass()
    const options = {
        retrieveAttachmentChatId: true,
        orgId,
        workspaceId,
        chatflowid,
        chatId
    }
    const files = (req.files as Express.Multer.File[]) || []
    const fileAttachments = []
    if (files.length) {
        const isBase64 = req.body.base64
        for (const file of files) {
            if (!allowedFileTypes.length) {
                throw new InternalFlowiseError(
                    StatusCodes.BAD_REQUEST,
                    `File type '${file.mimetype}' is not allowed. Allowed types: ${allowedFileTypes.join(', ')}`
                )
            }

            // Validate file type against allowed types
            if (allowedFileTypes.length > 0 && !allowedFileTypes.includes(file.mimetype)) {
                throw new InternalFlowiseError(
                    StatusCodes.BAD_REQUEST,
                    `File type '${file.mimetype}' is not allowed. Allowed types: ${allowedFileTypes.join(', ')}`
                )
            }

            await checkStorage(orgId, subscriptionId, appServer.usageCacheManager)

            const fileBuffer = await getFileFromUpload(file.path ?? file.key)
            const fileNames: string[] = []
            // Address file name with special characters: https://github.com/expressjs/multer/issues/1104
            file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8')
            const { path: storagePath, totalSize } = await addArrayFilesToStorage(
                file.mimetype,
                fileBuffer,
                file.originalname,
                fileNames,
                orgId,
                chatflowid,
                chatId
            )
            await updateStorageUsage(orgId, workspaceId, totalSize, appServer.usageCacheManager)

            const fileInputFieldFromMimeType = mapMimeTypeToInputField(file.mimetype)

            const fileExtension = path.extname(file.originalname)

            const fileInputFieldFromExt = mapExtToInputField(fileExtension)

            let fileInputField = 'txtFile'

            if (fileInputFieldFromExt !== 'txtFile') {
                fileInputField = fileInputFieldFromExt
            } else if (fileInputFieldFromMimeType !== 'txtFile') {
                fileInputField = fileInputFieldFromExt
            }

            await removeSpecificFileFromUpload(file.path ?? file.key)

            try {
                const nodeData = {
                    inputs: {
                        [fileInputField]: storagePath
                    },
                    outputs: { output: 'document' }
                }

                // Apply PDF specific configuration if this is a PDF file
                if (fileInputField === 'pdfFile') {
                    nodeData.inputs.usage = pdfConfig.usage
                    nodeData.inputs.legacyBuild = pdfConfig.legacyBuild as unknown as string
                }

                let content = ''

                if (isBase64) {
                    content = fileBuffer.toString('base64')
                } else {
                    const documents: IDocument[] = await fileLoaderNodeInstance.init(nodeData, '', options)
                    content = documents.map((doc) => doc.pageContent).join('\n')
                }

                fileAttachments.push({
                    name: file.originalname,
                    mimeType: file.mimetype,
                    size: file.size,
                    content
                })
            } catch (error) {
                throw new Error(`Failed createFileAttachment: ${file.originalname} (${file.mimetype} - ${getErrorMessage(error)}`)
            }
        }
    }

    return fileAttachments
}
