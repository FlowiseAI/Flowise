import { NextFunction, Request, Response } from 'express'
import exportImportService from '../../services/export-import'

const exportData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiResponse = await exportImportService.exportData(req, exportImportService.convertExportInput(req.body))
    return res.json(apiResponse)
  } catch (error) {
    next(error)
  }
}

const importData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const importData = req.body
    await exportImportService.importData(req, importData)
    return res.json({ message: 'success' })
  } catch (error) {
    next(error)
  }
}

export default {
  exportData,
  importData
}
