import express from 'express'
import exportImportController from '../../controllers/export-import'
const router = express.Router()

router.post('/export', exportImportController.exportData)

router.post('/import/all', exportImportController.importAll)

export default router
