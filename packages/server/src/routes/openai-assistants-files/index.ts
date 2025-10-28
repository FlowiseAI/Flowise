import openaiAssistantsController from '../../controllers/openai-assistants'
import { getMulterStorage } from '../../utils'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

router.post('/download/', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], openaiAssistantsController.getFileFromAssistant)
router.post(
    '/upload/',
    [Entitlements.unspecified],
    [AuthenticationStrategy.PUBLIC],
    getMulterStorage().array('files'),
    openaiAssistantsController.uploadAssistantFiles
)

export default router.getRouter()
