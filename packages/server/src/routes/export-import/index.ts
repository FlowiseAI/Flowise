import express from 'express'
import exportImportController from '../../controllers/export-import'
const router = express.Router()

router.get('/export/all', exportImportController.exportAll)

router.post('/import/all', exportImportController.importAll)

export default router
