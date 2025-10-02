import upsertHistoryController from '../../controllers/upsert-history'
import { entitled } from '../../services/entitled-router'

const router = entitled.Router()

// READ
router.get(['/', '/:id'], ['public'], upsertHistoryController.getAllUpsertHistory)

// PATCH
router.patch('/', ['public'], upsertHistoryController.patchDeleteUpsertHistory)

export default router.getRouter()
 