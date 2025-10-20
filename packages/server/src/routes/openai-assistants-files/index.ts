import openaiAssistantsController from '../../controllers/openai-assistants'
import { getMulterStorage } from '../../utils'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

router.post('/download/', [Entitlements.unspecified], openaiAssistantsController.getFileFromAssistant)
router.post('/upload/', [Entitlements.unspecified], getMulterStorage().array('files'), openaiAssistantsController.uploadAssistantFiles)

export default router
