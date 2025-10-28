import openaiAssistantsVectorStoreController from '../../controllers/openai-assistants-vector-store'
import { getMulterStorage } from '../../utils'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// CREATE
router.post('/', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], openaiAssistantsVectorStoreController.createAssistantVectorStore)

// READ
router.get('/:id', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], openaiAssistantsVectorStoreController.getAssistantVectorStore)

// LIST
router.get('/', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], openaiAssistantsVectorStoreController.listAssistantVectorStore)

// UPDATE
router.put(['/', '/:id'], [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], openaiAssistantsVectorStoreController.updateAssistantVectorStore)

// DELETE
router.delete(['/', '/:id'], [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], openaiAssistantsVectorStoreController.deleteAssistantVectorStore)

// POST
router.post(
    '/:id',
    [Entitlements.unspecified],
    [AuthenticationStrategy.PUBLIC],
    getMulterStorage().array('files'),
    openaiAssistantsVectorStoreController.uploadFilesToAssistantVectorStore
)

// DELETE
router.patch(['/', '/:id'], [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], openaiAssistantsVectorStoreController.deleteFilesFromAssistantVectorStore)

export default router.getRouter()
