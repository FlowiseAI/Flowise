import openaiRealTimeController from '../../controllers/openai-realtime'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

// GET
router.get(['/', '/:id'], [Entitlements.unspecified], openaiRealTimeController.getAgentTools)

// EXECUTE
router.post(['/', '/:id'], [Entitlements.unspecified], openaiRealTimeController.executeAgentTool)

export default router.getRouter()
