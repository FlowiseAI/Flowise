import { Request, Response, NextFunction } from 'express'
import path from 'path'
import contentDisposition from 'content-disposition'
import { getStoragePath } from 'flowise-components'
import * as fs from 'fs'

const streamUploadedImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.query.chatflowId || !req.query.chatId || !req.query.fileName) {
            return res.status(500).send(`Invalid file path`)
        }
        const chatflowId = req.query.chatflowId as string
        const chatId = req.query.chatId as string
        const fileName = req.query.fileName as string
        const filePath = path.join(getStoragePath(), chatflowId, chatId, fileName)
        //raise error if file path is not absolute
        if (!path.isAbsolute(filePath)) return res.status(500).send(`Invalid file path`)
        //raise error if file path contains '..'
        if (filePath.includes('..')) return res.status(500).send(`Invalid file path`)
        //only return from the storage folder
        if (!filePath.startsWith(getStoragePath())) return res.status(500).send(`Invalid file path`)

        if (fs.existsSync(filePath)) {
            res.setHeader('Content-Disposition', contentDisposition(path.basename(filePath)))
            const fileStream = fs.createReadStream(filePath)
            fileStream.pipe(res)
        } else {
            return res.status(404).send(`File ${fileName} not found`)
        }
    } catch (error) {
        next(error)
    }
}

export default {
    streamUploadedImage
}
