import openaiAssistantsVectorStoreController from '../../controllers/openai-assistants-vector-store'
import { getMulterStorage } from '../../utils'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

// CREATE
router.post('/', [Entitlements.unspecified], openaiAssistantsVectorStoreController.createAssistantVectorStore)

// READ
router.get('/:id', [Entitlements.unspecified], openaiAssistantsVectorStoreController.getAssistantVectorStore)

// LIST
router.get('/', [Entitlements.unspecified], openaiAssistantsVectorStoreController.listAssistantVectorStore)

// UPDATE
router.put(['/', '/:id'], [Entitlements.unspecified], openaiAssistantsVectorStoreController.updateAssistantVectorStore)

// DELETE
router.delete(['/', '/:id'], [Entitlements.unspecified], openaiAssistantsVectorStoreController.deleteAssistantVectorStore)

// POST
router.post(
    '/:id',
    [Entitlements.unspecified],
    getMulterStorage().array('files'),
    openaiAssistantsVectorStoreController.uploadFilesToAssistantVectorStore
)

// DELETE
router.patch(['/', '/:id'], [Entitlements.unspecified], openaiAssistantsVectorStoreController.deleteFilesFromAssistantVectorStore)

export default router
