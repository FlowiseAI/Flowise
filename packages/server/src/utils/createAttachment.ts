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
import { InternalFlowiseError } from '../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { ChatFlow } from '../database/entities/ChatFlow'

/**
 * Create attachment
 * @param {Request} req
 */
export const createFileAttachment = async (req: Request) => {
    const appServer = getRunningExpressApp()

    const chatflowid = req.params.chatflowId
    if (!chatflowid || !isValidUUID(chatflowid)) {
        throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Invalid chatflowId format - must be a valid UUID')
    }

    const chatId = req.params.chatId
    if (!chatId || !isValidUUID(chatId)) {
        throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Invalid chatId format - must be a valid UUID')
    }

    // Check for path traversal attempts
    if (isPathTraversal(chatflowid) || isPathTraversal(chatId)) {
        throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Invalid path characters detected')
    }

    // Validate chatflow exists and check API key
    const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({
        id: chatflowid
    })
    if (!chatflow) {
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowid} not found`)
    }

    // Find FileLoader node
    const fileLoaderComponent = appServer.nodesPool.componentNodes['fileLoader']
    const fileLoaderNodeInstanceFilePath = fileLoaderComponent.filePath as string
    const fileLoaderNodeModule = await import(fileLoaderNodeInstanceFilePath)
    const fileLoaderNodeInstance = new fileLoaderNodeModule.nodeClass()
    const options = {
        retrieveAttachmentChatId: true,
        chatflowid,
        chatId
    }
    const files = (req.files as Express.Multer.File[]) || []
    const fileAttachments = []
    if (files.length) {
        const isBase64 = req.body.base64
        for (const file of files) {
            const fileBuffer = await getFileFromUpload(file.path ?? file.key)
            const fileNames: string[] = []

            // Address file name with special characters: https://github.com/expressjs/multer/issues/1104
            file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8')

            const storagePath = await addArrayFilesToStorage(file.mimetype, fileBuffer, file.originalname, fileNames, chatflowid, chatId)

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
                throw new Error(`Failed operation: createFileAttachment - ${getErrorMessage(error)}`)
            }
        }
    }

    return fileAttachments
}
