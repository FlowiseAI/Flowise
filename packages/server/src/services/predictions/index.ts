import { Request, Response } from 'express'
import { buildChatflow } from '../../utils/buildChatflow'

//@ts-ignore
const createPrediction = async (req: Request, res: Response, socketIO) => {
    try {
        const dbResponse = await buildChatflow(req, res, socketIO)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: predictionService.createPrediction - ${error}`)
    }
}

export default {
    createPrediction
}
