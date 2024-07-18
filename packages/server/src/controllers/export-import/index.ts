import { NextFunction, Request, Response } from 'express'
import exportImportService from '../../services/export-import'

const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await exportImportService.getAll()
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAll
}
