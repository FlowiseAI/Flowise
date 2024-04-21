import { Request, Response, NextFunction } from 'express'
import contentDisposition from 'content-disposition'
import { streamStorageFile } from 'flowise-components'

const streamUploadedImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.query.chatflowId || !req.query.chatId || !req.query.fileName) {
            return res.status(500).send(`Invalid file path`)
        }
        const chatflowId = req.query.chatflowId as string
        const chatId = req.query.chatId as string
        const fileName = req.query.fileName as string
        res.setHeader('Content-Disposition', contentDisposition(fileName))
        const fileStream = await streamStorageFile(chatflowId, chatId, fileName)

        // ignore the type check for now
        // @ts-ignore
        if (fileStream?.pipe) {
            // @ts-ignore
            fileStream.pipe(res)
        } else {
            res.send(fileStream)
        }
    } catch (error) {
        next(error)
    }
}

export default {
    streamUploadedImage
}
