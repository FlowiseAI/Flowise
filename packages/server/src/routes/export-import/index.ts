import exportImportController from '../../controllers/export-import'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

router.post('/export', [Entitlements.workspace.export], exportImportController.exportData)

router.post('/import', [Entitlements.workspace.import], exportImportController.importData)

export default router
