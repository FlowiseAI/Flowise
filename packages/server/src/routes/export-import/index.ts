import express, { Router } from 'express'
import exportImportController from '../../controllers/export-import'
const router: Router = express.Router()

router.post('/export', exportImportController.exportData)

router.post('/import', exportImportController.importData)

export default router
