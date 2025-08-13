import { Request, Response, NextFunction } from 'express'
import fs from 'fs'
import contentDisposition from 'content-disposition'
import { streamStorageFile } from 'flowise-components'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'

const streamUploadedFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // console.log('req.query Image retriever', req.query)

        // Some clients may accidentally HTML-encode ampersands (e.g. &amp;chatId)
        // Normalize query by reparsing the raw query string with &amp; -> & fallback
        const ensureParams = () => {
            const params: Record<string, string | undefined> = {
                chatflowId: (req.query.chatflowId as string) || undefined,
                chatId: (req.query.chatId as string) || undefined,
                fileName: (req.query.fileName as string) || undefined
            }

            if (!params.chatflowId || !params.chatId || !params.fileName) {
                const rawQuery = (req.originalUrl || req.url || '').split('?')[1] || ''
                const normalizedRaw = rawQuery.replace(/&amp;/g, '&')
                const usp = new URLSearchParams(normalizedRaw)
                params.chatflowId = params.chatflowId || usp.get('chatflowId') || undefined
                params.chatId = params.chatId || usp.get('chatId') || undefined
                params.fileName = params.fileName || usp.get('fileName') || undefined
            }

            return params
        }

        const normalized = ensureParams()
        if (!normalized.chatflowId || !normalized.chatId || !normalized.fileName) {
            return res.status(500).send('Invalid file path')
        }

        const chatflowId = normalized.chatflowId
        const chatId = decodeURIComponent(normalized.chatId)
        const fileName = normalized.fileName
        res.setHeader('Content-Disposition', contentDisposition(fileName))
        const fileStream = await streamStorageFile(chatflowId, chatId, fileName)

        if (!fileStream) throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: streamStorageFile`)

        if (fileStream instanceof fs.ReadStream && fileStream?.pipe) {
            fileStream.pipe(res)
        } else {
            res.send(fileStream)
        }
    } catch (error) {
        next(error)
    }
}

export default {
    streamUploadedFile
}
