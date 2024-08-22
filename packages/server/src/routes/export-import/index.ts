import express from 'express'
import exportImportController from '../../controllers/export-import'
const router = express.Router()

// READ
router.get('/', exportImportController.exportAll)

export default router
