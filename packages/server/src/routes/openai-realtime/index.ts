import openaiRealTimeController from '../../controllers/openai-realtime'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// GET
router.get(['/', '/:id'], [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], openaiRealTimeController.getAgentTools)

// EXECUTE
router.post(['/', '/:id'], [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], openaiRealTimeController.executeAgentTool)

export default router
