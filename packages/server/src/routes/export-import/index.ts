import express from 'express'
import exportImportController from '../../controllers/export-import'
import { checkPermission } from '../../enterprise/rbac/PermissionCheck'
const router = express.Router()

router.post('/export', checkPermission('workspace:export'), exportImportController.exportData)

router.post('/import', checkPermission('workspace:import'), exportImportController.importData)

export default router
