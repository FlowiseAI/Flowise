import openaiAssistantsController from '../../controllers/openai-assistants'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

// READ
router.get('/', [Entitlements.unspecified], openaiAssistantsController.getAllOpenaiAssistants)
router.get(['/', '/:id'], [Entitlements.unspecified], openaiAssistantsController.getSingleOpenaiAssistant)

export default router.getRouter()
