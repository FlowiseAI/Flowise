import openaiAssistantsController from '../../controllers/openai-assistants'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// READ
router.get('/', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], openaiAssistantsController.getAllOpenaiAssistants)
router.get(['/', '/:id'], [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], openaiAssistantsController.getSingleOpenaiAssistant)

export default router.getRouter()
