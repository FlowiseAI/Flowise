import { Request, Response, NextFunction } from 'express'
import fetchLinksService from '../../services/fetch-links'

const getAllLinks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.query.url === 'undefined' || req.query.url === '') {
            throw new Error(`Error: fetchLinksController.getAllLinks - url not provided!`)
        }
        if (typeof req.query.relativeLinksMethod === 'undefined' || req.query.relativeLinksMethod === '') {
            throw new Error(`Error: fetchLinksController.getAllLinks - relativeLinksMethod not provided!`)
        }
        if (typeof req.query.limit === 'undefined' || req.query.limit === '') {
            throw new Error(`Error: fetchLinksController.getAllLinks - limit not provided!`)
        }
        const apiResponse = await fetchLinksService.getAllLinks(
            req.query.url as string,
            req.query.relativeLinksMethod as string,
            req.query.limit as string
        )
        if (apiResponse.executionError) {
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllLinks
}
