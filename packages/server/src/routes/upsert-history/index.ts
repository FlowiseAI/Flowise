import upsertHistoryController from '../../controllers/upsert-history'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

// READ
router.get(['/', '/:id'], [Entitlements.unspecified], upsertHistoryController.getAllUpsertHistory)

// PATCH
router.patch('/', [Entitlements.unspecified], upsertHistoryController.patchDeleteUpsertHistory)

export default router.getRouter()
