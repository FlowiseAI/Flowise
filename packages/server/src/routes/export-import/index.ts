import exportImportController from '../../controllers/export-import'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

router.post('/export', [Entitlements.workspace.export], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], exportImportController.exportData)

router.post('/import', [Entitlements.workspace.import], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], exportImportController.importData)

export default router.getRouter()
