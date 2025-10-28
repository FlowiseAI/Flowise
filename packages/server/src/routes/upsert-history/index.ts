import upsertHistoryController from '../../controllers/upsert-history'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// READ
router.get(['/', '/:id'], [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], upsertHistoryController.getAllUpsertHistory)

// PATCH
router.patch('/', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], upsertHistoryController.patchDeleteUpsertHistory)

export default router
