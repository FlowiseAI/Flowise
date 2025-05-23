import { Request, Response, NextFunction } from 'express'
import { addSingleFileToStorage } from 'flowise-components'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'

const uploadDalleImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body.base64Data || !req.body.filename) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Missing required fields: base64Data and filename')
        }

        const { base64Data, filename } = req.body

        // Convert base64 to Buffer
        const buffer = Buffer.from(base64Data, 'base64')

        // Store the image using the storage utility
        const storageUrl = await addSingleFileToStorage('image/png', buffer, filename, 'dalle-images', 'generated')

        // Convert FILE-STORAGE:: reference to a full URL
        const fileName = storageUrl.replace('FILE-STORAGE::', '')
        const fullUrl = `/api/v1/get-upload-file?chatflowId=dalle-images&chatId=generated&fileName=${fileName}`

        return res.json({
            url: fullUrl,
            success: true
        })
    } catch (error) {
        next(error)
    }
}

export default {
    uploadDalleImage
}
