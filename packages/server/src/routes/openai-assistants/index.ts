import openaiAssistantsController from '../../controllers/openai-assistants'
import { entitled } from '../../services/entitled-router'

const router = entitled.Router()

// READ
router.get('/', ['public'], openaiAssistantsController.getAllOpenaiAssistants)
router.get(['/', '/:id'], ['public'], openaiAssistantsController.getSingleOpenaiAssistant)

export default router.getRouter()
