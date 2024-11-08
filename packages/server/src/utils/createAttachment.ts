import { Request } from 'express'
import * as path from 'path'
import * as fs from 'fs'
import { addArrayFilesToStorage, IDocument, mapExtToInputField, mapMimeTypeToInputField } from 'flowise-components'
import { getRunningExpressApp } from './getRunningExpressApp'
import { getErrorMessage } from '../errors/utils'

/**
 * Create attachment
 * @param {Request} req
 */
export const createFileAttachment = async (req: Request) => {
    const appServer = getRunningExpressApp()

    const chatflowid = req.params.chatflowId
    if (!chatflowid) {
        throw new Error(
            'Params chatflowId is required! Please provide chatflowId and chatId in the URL: /api/v1/attachments/:chatflowId/:chatId'
        )
    }

    const chatId = req.params.chatId
    if (!chatId) {
        throw new Error(
            'Params chatId is required! Please provide chatflowId and chatId in the URL: /api/v1/attachments/:chatflowId/:chatId'
        )
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
        for (const file of files) {
            const fileBuffer = fs.readFileSync(file.path)
            const fileNames: string[] = []
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

            fs.unlinkSync(file.path)

            try {
                const nodeData = {
                    inputs: {
                        [fileInputField]: storagePath
                    }
                }
                const documents: IDocument[] = await fileLoaderNodeInstance.init(nodeData, '', options)
                const pageContents = documents.map((doc) => doc.pageContent).join('\n')
                fileAttachments.push({
                    name: file.originalname,
                    mimeType: file.mimetype,
                    size: file.size,
                    content: pageContents
                })
            } catch (error) {
                throw new Error(`Failed operation: createFileAttachment - ${getErrorMessage(error)}`)
            }
        }
    }

    return fileAttachments
}
