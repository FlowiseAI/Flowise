import { NextFunction, Request, Response } from 'express'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { Tool } from '../../database/entities/Tool'
import exportImportService from '../../services/export-import'

const exportAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await exportImportService.exportAll()
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const importAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const importData: { Tool: Partial<Tool>[]; ChatFlow: Partial<ChatFlow>[] } = req.body
        const apiResponse = await exportImportService.importAll(importData)
        return res.json({ message: 'success' })
    } catch (error) {
        next(error)
    }
}

export default {
    exportAll,
    importAll
}
